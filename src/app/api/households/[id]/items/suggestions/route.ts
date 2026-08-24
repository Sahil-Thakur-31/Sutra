import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import type { GroceryItemDoc } from "@/lib/household/groceryItem";
import type { ItemSuggestionDTO } from "@/lib/types";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  // Most-recent distinct items (by lowercased name) this household has ever
  // added -- powers the "recommend from history while typing" autocomplete.
  const docs = await db
    .collection<GroceryItemDoc>("groceryItems")
    .aggregate<GroceryItemDoc>([
      { $match: { householdId } },
      { $sort: { createdAt: -1 } },
      { $group: { _id: { $toLower: "$originalText" }, doc: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$doc" } },
      { $sort: { createdAt: -1 } },
      { $limit: 25 },
    ])
    .toArray();

  const suggestions: ItemSuggestionDTO[] = docs.map((doc) => ({
    originalText: doc.originalText,
    originalLang: doc.originalLang,
    quantity: doc.quantity,
    unit: doc.unit,
    category: doc.category,
  }));

  return NextResponse.json({ suggestions });
}
