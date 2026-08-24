import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toWordDTO, type WordDoc } from "@/lib/household/word";

type Params = { params: Promise<{ id: string; wordId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, wordId } = await params;
  if (!ObjectId.isValid(wordId)) return NextResponse.json({ error: "Invalid word id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: { learned?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (typeof body.learned !== "boolean") {
    return NextResponse.json({ error: "learned must be a boolean." }, { status: 400 });
  }

  const words = db.collection<WordDoc>("words");
  const updated = await words.findOneAndUpdate(
    { _id: new ObjectId(wordId), householdId },
    body.learned ? { $addToSet: { learnedByUids: uid } } : { $pull: { learnedByUids: uid } },
    { returnDocument: "after" }
  );
  if (!updated) return NextResponse.json({ error: "Word not found." }, { status: 404 });

  return NextResponse.json({ word: toWordDTO(updated) });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, wordId } = await params;
  if (!ObjectId.isValid(wordId)) return NextResponse.json({ error: "Invalid word id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<WordDoc>("words").deleteOne({ _id: new ObjectId(wordId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Word not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
