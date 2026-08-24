import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toPollDTO, type PollDoc } from "@/lib/household/poll";

type Params = { params: Promise<{ id: string; pollId: string }> };

interface PatchBody {
  vote?: string; // option id to vote for, or null to retract
  closed?: boolean;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, pollId } = await params;
  if (!ObjectId.isValid(pollId)) return NextResponse.json({ error: "Invalid poll id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const polls = db.collection<PollDoc>("polls");
  const existing = await polls.findOne({ _id: new ObjectId(pollId), householdId });
  if (!existing) return NextResponse.json({ error: "Poll not found." }, { status: 404 });

  if (body.vote !== undefined) {
    if (existing.closed) return NextResponse.json({ error: "This poll is closed." }, { status: 400 });
    if (!existing.options.some((o) => o.id === body.vote)) {
      return NextResponse.json({ error: "Invalid option." }, { status: 400 });
    }
    // Single-choice: remove this voter from every option, then add to the chosen one.
    const options = existing.options.map((o) => ({
      ...o,
      voterUids: o.voterUids.filter((v) => v !== uid).concat(o.id === body.vote ? [uid] : []),
    }));
    await polls.updateOne({ _id: existing._id }, { $set: { options } });
  }

  if (typeof body.closed === "boolean") {
    if (existing.createdByUid !== uid) {
      return NextResponse.json({ error: "Only the poll creator can close it." }, { status: 403 });
    }
    await polls.updateOne({ _id: existing._id }, { $set: { closed: body.closed } });
  }

  const updated = await polls.findOne({ _id: existing._id });
  if (!updated) return NextResponse.json({ error: "Poll not found." }, { status: 404 });

  const poll = toPollDTO(updated);
  publish(householdId, { type: "poll-updated", poll });

  return NextResponse.json({ poll });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, pollId } = await params;
  if (!ObjectId.isValid(pollId)) return NextResponse.json({ error: "Invalid poll id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<PollDoc>("polls").deleteOne({ _id: new ObjectId(pollId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Poll not found." }, { status: 404 });

  publish(householdId, { type: "poll-removed", pollId });

  return NextResponse.json({ ok: true });
}
