import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toChoreDTO, startOfDay, type ChoreDoc } from "@/lib/household/chore";
import type { ChoreRecurrence } from "@/lib/types";

const RECURRENCES: ChoreRecurrence[] = ["once", "daily", "weekly"];

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  // Recurring chores stay perpetually "active" (they roll forward on
  // completion), so the active list is: every recurring chore, plus one-time
  // chores that haven't been done yet.
  const docs = await db
    .collection<ChoreDoc>("chores")
    .find({ householdId, $or: [{ recurrence: { $ne: "once" } }, { status: "pending" }] })
    .sort({ dueDate: 1 })
    .toArray();

  return NextResponse.json({ chores: docs.map(toChoreDTO) });
}

interface CreateChoreBody {
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  recurrence?: ChoreRecurrence;
  assigneeUid?: string | null;
  dueDate?: number;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateChoreBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Chore title is required." }, { status: 400 });

  const recurrence = body.recurrence ?? "once";
  if (!RECURRENCES.includes(recurrence)) return NextResponse.json({ error: "Invalid recurrence." }, { status: 400 });

  const assigneeUid = body.assigneeUid || null;
  let assigneeName: string | null = null;
  if (assigneeUid) {
    if (!household.memberUids.includes(assigneeUid)) {
      return NextResponse.json({ error: "Assignee must be a household member." }, { status: 400 });
    }
    const assigneeDoc = await db.collection("users").findOne({ _id: new ObjectId(assigneeUid) });
    assigneeName = assigneeDoc?.name ?? null;
  }

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const createdAt = Date.now();
  const dueDate = startOfDay(body.dueDate ?? createdAt);

  const newDoc: ChoreDoc = {
    householdId,
    title,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    recurrence,
    assigneeUid,
    assigneeName,
    dueDate,
    status: "pending",
    completedByUid: null,
    completedByName: null,
    completedAt: null,
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt,
  };

  const insertResult = await db.collection<ChoreDoc>("chores").insertOne(newDoc);
  const chore = toChoreDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "chore-added", chore });

  return NextResponse.json({ chore });
}
