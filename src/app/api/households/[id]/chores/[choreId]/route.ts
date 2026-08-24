import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toChoreDTO, nextDueDate, type ChoreDoc, type ChoreCompletionDoc } from "@/lib/household/chore";

type Params = { params: Promise<{ id: string; choreId: string }> };

interface PatchBody {
  done?: boolean;
  assigneeUid?: string | null;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, choreId } = await params;
  if (!ObjectId.isValid(choreId)) return NextResponse.json({ error: "Invalid chore id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const chores = db.collection<ChoreDoc>("chores");
  const existing = await chores.findOne({ _id: new ObjectId(choreId), householdId });
  if (!existing) return NextResponse.json({ error: "Chore not found." }, { status: 404 });

  if (body.assigneeUid !== undefined) {
    const assigneeUid = body.assigneeUid || null;
    let assigneeName: string | null = null;
    if (assigneeUid) {
      if (!household.memberUids.includes(assigneeUid)) {
        return NextResponse.json({ error: "Assignee must be a household member." }, { status: 400 });
      }
      const assigneeDoc = await db.collection("users").findOne({ _id: new ObjectId(assigneeUid) });
      assigneeName = assigneeDoc?.name ?? null;
    }
    await chores.updateOne({ _id: existing._id }, { $set: { assigneeUid, assigneeName } });
  }

  if (body.done === true) {
    const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
    const completedByName = userDoc?.name ?? "Someone";
    const completedAt = Date.now();

    await db.collection<ChoreCompletionDoc>("choreCompletions").insertOne({
      householdId,
      choreId,
      title: existing.title,
      translations: existing.translations,
      completedByUid: uid,
      completedByName,
      completedAt,
    });

    if (existing.recurrence === "once") {
      await chores.updateOne(
        { _id: existing._id },
        { $set: { status: "done", completedByUid: uid, completedByName, completedAt } }
      );
    } else {
      // Recurring: log the completion, then roll forward to the next period
      // and reset -- the chore itself stays perpetually on the active list.
      await chores.updateOne(
        { _id: existing._id },
        {
          $set: {
            dueDate: nextDueDate(existing.dueDate, existing.recurrence),
            status: "pending",
            completedByUid: null,
            completedByName: null,
            completedAt: null,
          },
        }
      );
    }
  }

  const updated = await chores.findOne({ _id: existing._id });
  if (!updated) return NextResponse.json({ error: "Chore not found." }, { status: 404 });

  const chore = toChoreDTO(updated);
  publish(householdId, { type: "chore-updated", chore });

  return NextResponse.json({ chore });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, choreId } = await params;
  if (!ObjectId.isValid(choreId)) return NextResponse.json({ error: "Invalid chore id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<ChoreDoc>("chores").deleteOne({ _id: new ObjectId(choreId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Chore not found." }, { status: 404 });

  publish(householdId, { type: "chore-removed", choreId });

  return NextResponse.json({ ok: true });
}
