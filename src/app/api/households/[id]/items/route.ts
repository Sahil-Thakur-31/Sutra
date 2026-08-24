import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toGroceryItemDTO, type GroceryItemDoc } from "@/lib/household/groceryItem";
import { UNITS, CATEGORIES } from "@/lib/groceryMeta";

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

  const status = request.nextUrl.searchParams.get("status") === "purchased" ? "purchased" : "active";
  const collection = db.collection<GroceryItemDoc>("groceryItems");

  let docs;
  if (status === "active") {
    docs = await collection.find({ householdId, purchasedAt: null }).sort({ createdAt: -1 }).toArray();
  } else {
    const monthParam = request.nextUrl.searchParams.get("month");
    const range = monthParam ? monthRange(monthParam) : null;
    if (!range) return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });
    docs = await collection
      .find({ householdId, purchasedAt: { $gte: range.start, $lt: range.end } })
      .sort({ purchasedAt: -1 })
      .toArray();
  }

  return NextResponse.json({ items: docs.map(toGroceryItemDTO) });
}

interface CreateItemBody {
  originalText: string;
  originalLang: string;
  translations: Record<string, string>;
  quantity?: number;
  unit?: string;
  category?: string;
  note?: string;
  noteTranslations?: Record<string, string>;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateItemBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const originalText = body.originalText?.trim();
  if (!originalText) return NextResponse.json({ error: "Item text is required." }, { status: 400 });

  const quantity = body.quantity ?? 1;
  if (typeof quantity !== "number" || !Number.isFinite(quantity) || quantity <= 0) {
    return NextResponse.json({ error: "Quantity must be a positive number." }, { status: 400 });
  }
  const unit = body.unit ?? "pcs";
  if (!UNITS.includes(unit as (typeof UNITS)[number])) {
    return NextResponse.json({ error: "Invalid unit." }, { status: 400 });
  }
  const category = body.category ?? "other";
  if (!CATEGORIES.some((c) => c.value === category)) {
    return NextResponse.json({ error: "Invalid category." }, { status: 400 });
  }
  const note = body.note?.trim() || null;

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const createdAt = Date.now();
  const newDoc: GroceryItemDoc = {
    householdId,
    originalText,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    quantity,
    unit,
    category,
    note,
    noteTranslations: note ? body.noteTranslations ?? {} : null,
    addedByUid: uid,
    addedByName: userDoc.name,
    purchasedAt: null,
    purchasedByUid: null,
    createdAt,
  };

  const insertResult = await db.collection<GroceryItemDoc>("groceryItems").insertOne(newDoc);

  const item = toGroceryItemDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "item-added", item });

  return NextResponse.json({ item });
}
