import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toMealDTO, type MealDoc } from "@/lib/household/meal";
import type { MealType } from "@/lib/types";

const MEAL_TYPES: MealType[] = ["breakfast", "lunch", "dinner"];
const DAY_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const weekParam = request.nextUrl.searchParams.get("week");
  const start = weekParam ? Number(weekParam) : NaN;
  if (!Number.isFinite(start)) return NextResponse.json({ error: "A valid week start timestamp is required." }, { status: 400 });

  const docs = await db
    .collection<MealDoc>("meals")
    .find({ householdId, date: { $gte: start, $lt: start + 7 * DAY_MS } })
    .sort({ date: 1 })
    .toArray();

  return NextResponse.json({ meals: docs.map(toMealDTO) });
}

interface CreateMealBody {
  date: number;
  mealType: MealType;
  description: string;
  originalLang: string;
  translations: Record<string, string>;
  assignedToUid?: string;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateMealBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const description = body.description?.trim();
  if (!description) return NextResponse.json({ error: "Meal description is required." }, { status: 400 });

  if (!MEAL_TYPES.includes(body.mealType)) return NextResponse.json({ error: "Invalid meal type." }, { status: 400 });
  if (!Number.isFinite(body.date)) return NextResponse.json({ error: "A valid date is required." }, { status: 400 });

  const memberUids: string[] = household.memberUids;
  let assignedToUid: string | null = null;
  let assignedToName: string | null = null;
  if (body.assignedToUid) {
    if (!memberUids.includes(body.assignedToUid)) {
      return NextResponse.json({ error: "Assignee must be a household member." }, { status: 400 });
    }
    assignedToUid = body.assignedToUid;
    const assigneeDoc = await db.collection("users").findOne({ _id: new ObjectId(assignedToUid) });
    assignedToName = assigneeDoc?.name ?? null;
  }

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const d = new Date(body.date);
  d.setHours(0, 0, 0, 0);

  const newDoc: MealDoc = {
    householdId,
    date: d.getTime(),
    mealType: body.mealType,
    description,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    assignedToUid,
    assignedToName,
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<MealDoc>("meals").insertOne(newDoc);
  const meal = toMealDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "meal-added", meal });

  return NextResponse.json({ meal });
}
