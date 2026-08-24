import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toWishlistItemDTO, redactForViewer, type WishlistItemDoc } from "@/lib/household/wishlistItem";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db
    .collection<WishlistItemDoc>("wishlistItems")
    .find({ householdId })
    .sort({ createdAt: -1 })
    .toArray();

  const items = docs.map(toWishlistItemDTO).map((item) => redactForViewer(item, uid));

  return NextResponse.json({ items });
}

interface CreateWishlistItemBody {
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  url?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateWishlistItemBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Title is required." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  // Always the caller's own list -- a client can never add to someone else's.
  const newDoc: WishlistItemDoc = {
    householdId,
    ownerUid: uid,
    ownerName: userDoc.name,
    title,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    url: body.url?.trim() || null,
    reservedByUid: null,
    reservedByName: null,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<WishlistItemDoc>("wishlistItems").insertOne(newDoc);
  const item = toWishlistItemDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "wishlist-added", item });

  // Echo back the redacted view too, even though the owner already knows
  // everything about their own new item -- keeps the response shape consistent.
  return NextResponse.json({ item: redactForViewer(item, uid) });
}
