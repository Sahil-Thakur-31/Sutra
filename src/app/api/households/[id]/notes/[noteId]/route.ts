import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toNoteDTO, type NoteDoc } from "@/lib/household/note";

type Params = { params: Promise<{ id: string; noteId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, noteId } = await params;
  if (!ObjectId.isValid(noteId)) return NextResponse.json({ error: "Invalid note id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: { pinned?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.pinned !== "boolean") return NextResponse.json({ error: "pinned must be a boolean." }, { status: 400 });

  const notes = db.collection<NoteDoc>("notes");
  const updated = await notes.findOneAndUpdate(
    { _id: new ObjectId(noteId), householdId },
    { $set: { pinned: body.pinned } },
    { returnDocument: "after" }
  );
  if (!updated) return NextResponse.json({ error: "Note not found." }, { status: 404 });

  const note = toNoteDTO(updated);
  publish(householdId, { type: "note-updated", note });

  return NextResponse.json({ note });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, noteId } = await params;
  if (!ObjectId.isValid(noteId)) return NextResponse.json({ error: "Invalid note id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<NoteDoc>("notes").deleteOne({ _id: new ObjectId(noteId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Note not found." }, { status: 404 });

  publish(householdId, { type: "note-removed", noteId });

  return NextResponse.json({ ok: true });
}
