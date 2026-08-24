import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toBillDTO, type BillDoc } from "@/lib/household/bill";
import { BILL_CATEGORIES } from "@/lib/billMeta";
import type { BillKind } from "@/lib/types";

function monthRange(month: string): { start: number; end: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) return null;
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return { start: new Date(year, monthIndex, 1).getTime(), end: new Date(year, monthIndex + 1, 1).getTime() };
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const monthParam = request.nextUrl.searchParams.get("month");
  const range = monthParam ? monthRange(monthParam) : null;
  if (!range) return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });

  const docs = await db
    .collection<BillDoc>("bills")
    .find({ householdId, createdAt: { $gte: range.start, $lt: range.end } })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ bills: docs.map(toBillDTO) });
}

interface CreateBillBody {
  kind: BillKind;
  description: string;
  originalLang: string;
  translations: Record<string, string>;
  amount: number;
  category?: string;
  paidByUid?: string;
  splitAmong?: string[];
  fromUid?: string;
  toUid?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateBillBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const amount = Number(body.amount);
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }

  const memberUids: string[] = household.memberUids;
  const users = db.collection("users");
  const createdAt = Date.now();
  const createdByDoc = await users.findOne({ _id: new ObjectId(uid) });
  if (!createdByDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  let newDoc: BillDoc;

  if (body.kind === "settlement") {
    const fromUid = body.fromUid;
    const toUid = body.toUid;
    if (!fromUid || !toUid || !memberUids.includes(fromUid) || !memberUids.includes(toUid)) {
      return NextResponse.json({ error: "Both parties must be household members." }, { status: 400 });
    }
    if (fromUid === toUid) return NextResponse.json({ error: "Choose two different members." }, { status: 400 });

    const [fromDoc, toDoc] = await Promise.all([
      users.findOne({ _id: new ObjectId(fromUid) }),
      users.findOne({ _id: new ObjectId(toUid) }),
    ]);

    newDoc = {
      householdId,
      kind: "settlement",
      description: body.description?.trim() || "Settled up",
      originalLang: body.originalLang,
      translations: body.translations ?? {},
      amount,
      category: null,
      paidByUid: null,
      paidByName: null,
      splitAmong: null,
      fromUid,
      fromName: fromDoc?.name ?? null,
      toUid,
      toName: toDoc?.name ?? null,
      createdByUid: uid,
      createdByName: createdByDoc.name,
      createdAt,
    };
  } else {
    const description = body.description?.trim();
    if (!description) return NextResponse.json({ error: "Description is required." }, { status: 400 });

    const category = body.category && BILL_CATEGORIES.some((c) => c.value === body.category) ? body.category : "other";
    const paidByUid = body.paidByUid || uid;
    if (!memberUids.includes(paidByUid)) {
      return NextResponse.json({ error: "Payer must be a household member." }, { status: 400 });
    }

    const splitAmong = body.splitAmong?.length ? body.splitAmong.filter((u) => memberUids.includes(u)) : memberUids;
    if (splitAmong.length === 0) return NextResponse.json({ error: "Split among at least one member." }, { status: 400 });

    const paidByDoc = paidByUid === uid ? createdByDoc : await users.findOne({ _id: new ObjectId(paidByUid) });

    newDoc = {
      householdId,
      kind: "expense",
      description,
      originalLang: body.originalLang,
      translations: body.translations ?? {},
      amount,
      category,
      paidByUid,
      paidByName: paidByDoc?.name ?? null,
      splitAmong,
      fromUid: null,
      fromName: null,
      toUid: null,
      toName: null,
      createdByUid: uid,
      createdByName: createdByDoc.name,
      createdAt,
    };
  }

  const insertResult = await db.collection<BillDoc>("bills").insertOne(newDoc);
  const bill = toBillDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "bill-added", bill });

  return NextResponse.json({ bill });
}
