import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import type { CalendarEventDoc } from "@/lib/household/calendarEvent";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; eventId: string }> }
) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, eventId } = await params;
  if (!ObjectId.isValid(eventId)) return NextResponse.json({ error: "Invalid event id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<CalendarEventDoc>("events").deleteOne({ _id: new ObjectId(eventId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Event not found." }, { status: 404 });

  publish(householdId, { type: "event-removed", eventId });

  return NextResponse.json({ ok: true });
}
