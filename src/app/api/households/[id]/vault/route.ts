import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toVaultEntryDTO, type VaultEntryDoc } from "@/lib/household/vaultEntry";
import { VAULT_CATEGORIES } from "@/lib/vaultMeta";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const docs = await db
    .collection<VaultEntryDoc>("vaultEntries")
    .find({ householdId })
    .sort({ category: 1, createdAt: -1 })
    .toArray();

  return NextResponse.json({ entries: docs.map(toVaultEntryDTO) });
}

interface CreateEntryBody {
  label: string;
  originalLang: string;
  translations: Record<string, string>;
  value: string;
  category?: string;
  sensitive?: boolean;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateEntryBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const label = body.label?.trim();
  const value = body.value?.trim();
  if (!label) return NextResponse.json({ error: "Label is required." }, { status: 400 });
  if (!value) return NextResponse.json({ error: "Value is required." }, { status: 400 });

  const category = body.category && VAULT_CATEGORIES.some((c) => c.value === body.category) ? body.category : "other";

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: VaultEntryDoc = {
    householdId,
    label,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    value,
    category,
    sensitive: !!body.sensitive,
    createdByUid: uid,
    createdByName: userDoc.name,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<VaultEntryDoc>("vaultEntries").insertOne(newDoc);
  const entry = toVaultEntryDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "vault-added", entry });

  return NextResponse.json({ entry });
}
