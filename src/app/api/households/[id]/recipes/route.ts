import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toRecipeDTO, type RecipeDoc } from "@/lib/household/recipe";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db.collection<RecipeDoc>("recipes").find({ householdId }).sort({ createdAt: -1 }).toArray();
  return NextResponse.json({ recipes: docs.map(toRecipeDTO) });
}

interface CreateRecipeBody {
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  ingredients: string;
  ingredientsTranslations: Record<string, string>;
  steps: string;
  stepsTranslations: Record<string, string>;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateRecipeBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = body.title?.trim();
  const ingredients = body.ingredients?.trim();
  const steps = body.steps?.trim();
  if (!title) return NextResponse.json({ error: "Recipe title is required." }, { status: 400 });
  if (!ingredients) return NextResponse.json({ error: "Ingredients are required." }, { status: 400 });
  if (!steps) return NextResponse.json({ error: "Steps are required." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: RecipeDoc = {
    householdId,
    title,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    ingredients,
    ingredientsTranslations: body.ingredientsTranslations ?? {},
    steps,
    stepsTranslations: body.stepsTranslations ?? {},
    addedByUid: uid,
    addedByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<RecipeDoc>("recipes").insertOne(newDoc);
  const recipe = toRecipeDTO({ _id: insertResult.insertedId, ...newDoc });

  return NextResponse.json({ recipe });
}
