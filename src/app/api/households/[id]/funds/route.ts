import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toFundDTO, type FundDoc, type ContributionDoc } from "@/lib/household/fund";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const fundDocs = await db.collection<FundDoc>("funds").find({ householdId }).sort({ createdAt: -1 }).toArray();

  const totals = await db
    .collection<ContributionDoc>("fundContributions")
    .aggregate<{ _id: string; total: number }>([
      { $match: { householdId } },
      { $group: { _id: "$fundId", total: { $sum: "$amount" } } },
    ])
    .toArray();
  const totalsByFund = new Map(totals.map((t) => [t._id, t.total]));

  const funds = fundDocs.map((doc) => toFundDTO(doc, totalsByFund.get(doc._id.toHexString()) ?? 0));

  return NextResponse.json({ funds });
}

interface CreateFundBody {
  name: string;
  originalLang: string;
  translations: Record<string, string>;
  targetAmount: number;
  currency?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateFundBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Fund name is required." }, { status: 400 });
  if (typeof body.targetAmount !== "number" || !Number.isFinite(body.targetAmount) || body.targetAmount <= 0) {
    return NextResponse.json({ error: "Target amount must be a positive number." }, { status: 400 });
  }

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: FundDoc = {
    householdId,
    name,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    targetAmount: body.targetAmount,
    currency: body.currency?.trim() || "₹",
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<FundDoc>("funds").insertOne(newDoc);
  const fund = toFundDTO({ _id: insertResult.insertedId, ...newDoc }, 0);

  return NextResponse.json({ fund });
}
