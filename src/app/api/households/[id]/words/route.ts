import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toWordDTO, type WordDoc } from "@/lib/household/word";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db.collection<WordDoc>("words").find({ householdId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ words: docs.map(toWordDTO) });
}

interface CreateWordBody {
  phrase: string;
  originalLang: string;
  translations: Record<string, string>;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateWordBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const phrase = body.phrase?.trim();
  if (!phrase) return NextResponse.json({ error: "A word or phrase is required." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: WordDoc = {
    householdId,
    phrase,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    addedByUid: uid,
    addedByName: userDoc.name,
    learnedByUids: [],
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<WordDoc>("words").insertOne(newDoc);
  const word = toWordDTO({ _id: insertResult.insertedId, ...newDoc });

  return NextResponse.json({ word });
}
