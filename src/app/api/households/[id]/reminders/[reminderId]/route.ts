import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toReminderDTO, nextReminderDate, type ReminderDoc, type ReminderLogDoc } from "@/lib/household/reminder";

type Params = { params: Promise<{ id: string; reminderId: string }> };

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, reminderId } = await params;
  if (!ObjectId.isValid(reminderId)) return NextResponse.json({ error: "Invalid reminder id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: { done?: boolean };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }
  if (body.done !== true) return NextResponse.json({ error: "Nothing to update." }, { status: 400 });

  const reminders = db.collection<ReminderDoc>("reminders");
  const existing = await reminders.findOne({ _id: new ObjectId(reminderId), householdId });
  if (!existing) return NextResponse.json({ error: "Reminder not found." }, { status: 404 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  const dismissedByName = userDoc?.name ?? "Someone";
  const dismissedAt = Date.now();

  await db.collection<ReminderLogDoc>("reminderLogs").insertOne({
    householdId,
    reminderId,
    title: existing.title,
    translations: existing.translations,
    dismissedByUid: uid,
    dismissedByName,
    dismissedAt,
  });

  if (existing.recurrence === "once") {
    await reminders.updateOne(
      { _id: existing._id },
      { $set: { status: "done", dismissedByUid: uid, dismissedByName, dismissedAt } }
    );
  } else {
    await reminders.updateOne(
      { _id: existing._id },
      {
        $set: {
          dueDate: nextReminderDate(existing.dueDate, existing.recurrence),
          status: "pending",
          dismissedByUid: null,
          dismissedByName: null,
          dismissedAt: null,
        },
      }
    );
  }

  const updated = await reminders.findOne({ _id: existing._id });
  if (!updated) return NextResponse.json({ error: "Reminder not found." }, { status: 404 });

  const reminder = toReminderDTO(updated);
  publish(householdId, { type: "reminder-updated", reminder });

  return NextResponse.json({ reminder });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, reminderId } = await params;
  if (!ObjectId.isValid(reminderId)) return NextResponse.json({ error: "Invalid reminder id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db
    .collection<ReminderDoc>("reminders")
    .deleteOne({ _id: new ObjectId(reminderId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Reminder not found." }, { status: 404 });

  publish(householdId, { type: "reminder-removed", reminderId });

  return NextResponse.json({ ok: true });
}
