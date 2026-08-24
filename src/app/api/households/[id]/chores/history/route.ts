import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { toChoreCompletionDTO, type ChoreCompletionDoc } from "@/lib/household/chore";

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

  const monthParam = request.nextUrl.searchParams.get("month");
  const range = monthParam ? monthRange(monthParam) : null;
  if (!range) return NextResponse.json({ error: "A valid month (YYYY-MM) is required." }, { status: 400 });

  const docs = await db
    .collection<ChoreCompletionDoc>("choreCompletions")
    .find({ householdId, completedAt: { $gte: range.start, $lt: range.end } })
    .sort({ completedAt: -1 })
    .toArray();

  return NextResponse.json({ completions: docs.map(toChoreCompletionDTO) });
}
