import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toPollDTO, type PollDoc } from "@/lib/household/poll";
import type { PollOption } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db.collection<PollDoc>("polls").find({ householdId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ polls: docs.map(toPollDTO) });
}

interface CreatePollBody {
  question: string;
  originalLang: string;
  translations: Record<string, string>;
  options: { text: string; translations: Record<string, string> }[];
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreatePollBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const question = body.question?.trim();
  if (!question) return NextResponse.json({ error: "A question is required." }, { status: 400 });

  const rawOptions = (body.options ?? []).filter((o) => o.text?.trim());
  if (rawOptions.length < 2) return NextResponse.json({ error: "Add at least two options." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const options: PollOption[] = rawOptions.map((o) => ({
    id: new ObjectId().toHexString(),
    text: o.text.trim(),
    translations: o.translations ?? {},
    voterUids: [],
  }));

  const newDoc: PollDoc = {
    householdId,
    question,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    options,
    closed: false,
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<PollDoc>("polls").insertOne(newDoc);
  const poll = toPollDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "poll-added", poll });

  return NextResponse.json({ poll });
}
