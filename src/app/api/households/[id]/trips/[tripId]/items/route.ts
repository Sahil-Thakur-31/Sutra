import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toPackingItemDTO, type PackingItemDoc } from "@/lib/household/trip";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tripId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, tripId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db
    .collection<PackingItemDoc>("packingItems")
    .find({ householdId, tripId })
    .sort({ createdAt: -1 })
    .toArray();

  return NextResponse.json({ items: docs.map(toPackingItemDTO) });
}

interface CreateItemBody {
  text: string;
  originalLang: string;
  translations: Record<string, string>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; tripId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, tripId } = await params;
  if (!ObjectId.isValid(tripId)) return NextResponse.json({ error: "Invalid trip id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateItemBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const text = body.text?.trim();
  if (!text) return NextResponse.json({ error: "Item text is required." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: PackingItemDoc = {
    householdId,
    tripId,
    text,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    packed: false,
    packedByUid: null,
    addedByUid: uid,
    addedByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<PackingItemDoc>("packingItems").insertOne(newDoc);
  const item = toPackingItemDTO({ _id: insertResult.insertedId, ...newDoc });

  return NextResponse.json({ item });
}
