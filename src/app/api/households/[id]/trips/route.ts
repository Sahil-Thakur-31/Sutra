import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toTripDTO, type TripDoc } from "@/lib/household/trip";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db.collection<TripDoc>("trips").find({ householdId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ trips: docs.map(toTripDTO) });
}

interface CreateTripBody {
  name: string;
  originalLang: string;
  translations: Record<string, string>;
  startDate?: number;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateTripBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) return NextResponse.json({ error: "Trip name is required." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: TripDoc = {
    householdId,
    name,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    startDate: body.startDate ?? null,
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<TripDoc>("trips").insertOne(newDoc);
  const trip = toTripDTO({ _id: insertResult.insertedId, ...newDoc });

  return NextResponse.json({ trip });
}
