import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import type { RecipeDoc } from "@/lib/household/recipe";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; recipeId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, recipeId } = await params;
  if (!ObjectId.isValid(recipeId)) return NextResponse.json({ error: "Invalid recipe id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<RecipeDoc>("recipes").deleteOne({ _id: new ObjectId(recipeId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Recipe not found." }, { status: 404 });

  return NextResponse.json({ ok: true });
}
