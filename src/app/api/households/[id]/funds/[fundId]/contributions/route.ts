import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toContributionDTO, type ContributionDoc, type FundDoc } from "@/lib/household/fund";
import { publish } from "@/lib/realtime/broadcaster";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fundId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, fundId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db
    .collection<ContributionDoc>("fundContributions")
    .find({ householdId, fundId })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ contributions: docs.map(toContributionDTO) });
}

interface CreateContributionBody {
  amount: number;
  note?: string;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; fundId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, fundId } = await params;
  if (!ObjectId.isValid(fundId)) return NextResponse.json({ error: "Invalid fund id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const fund = await db.collection<FundDoc>("funds").findOne({ _id: new ObjectId(fundId), householdId });
  if (!fund) return NextResponse.json({ error: "Fund not found." }, { status: 404 });

  let body: CreateContributionBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  if (typeof body.amount !== "number" || !Number.isFinite(body.amount) || body.amount <= 0) {
    return NextResponse.json({ error: "Amount must be a positive number." }, { status: 400 });
  }

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: ContributionDoc = {
    householdId,
    fundId,
    amount: body.amount,
    note: body.note?.trim() || null,
    contributedByUid: uid,
    contributedByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<ContributionDoc>("fundContributions").insertOne(newDoc);
  const contribution = toContributionDTO({ _id: insertResult.insertedId, ...newDoc });

  const totalAgg = await db
    .collection<ContributionDoc>("fundContributions")
    .aggregate<{ _id: null; total: number }>([
      { $match: { householdId, fundId } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ])
    .toArray();
  const totalSaved = totalAgg[0]?.total ?? 0;

  publish(householdId, { type: "contribution-added", fundId, totalSaved, contribution });

  return NextResponse.json({ contribution, totalSaved });
}
