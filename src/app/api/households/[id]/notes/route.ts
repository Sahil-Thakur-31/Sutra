import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toNoteDTO, type NoteDoc } from "@/lib/household/note";
import { NOTE_COLORS } from "@/lib/noteMeta";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db
    .collection<NoteDoc>("notes")
    .find({ householdId })
    .sort({ pinned: -1, createdAt: -1 })
    .toArray();

  return NextResponse.json({ notes: docs.map(toNoteDTO) });
}

interface CreateNoteBody {
  text: string;
  originalLang: string;
  translations: Record<string, string>;
  color?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateNoteBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "Note text is required." }, { status: 400 });

  const color = body.color && NOTE_COLORS.some((c) => c.value === body.color) ? body.color : "amber";

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: NoteDoc = {
    householdId,
    text,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    color,
    pinned: false,
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<NoteDoc>("notes").insertOne(newDoc);
  const note = toNoteDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "note-added", note });

  return NextResponse.json({ note });
}
