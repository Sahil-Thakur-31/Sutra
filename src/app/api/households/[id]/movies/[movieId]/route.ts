import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toMovieDTO, type MovieDoc } from "@/lib/household/movie";

type Params = { params: Promise<{ id: string; movieId: string }> };

interface PatchBody {
  vote?: boolean;
  watched?: boolean;
}

export async function PATCH(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, movieId } = await params;
  if (!ObjectId.isValid(movieId)) return NextResponse.json({ error: "Invalid movie id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: PatchBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const movies = db.collection<MovieDoc>("movies");
  const existing = await movies.findOne({ _id: new ObjectId(movieId), householdId });
  if (!existing) return NextResponse.json({ error: "Movie not found." }, { status: 404 });

  if (body.vote !== undefined) {
    const hasVoted = existing.votes.includes(uid);
    const votes = body.vote
      ? hasVoted
        ? existing.votes
        : [...existing.votes, uid]
      : existing.votes.filter((v) => v !== uid);
    await movies.updateOne({ _id: existing._id }, { $set: { votes } });
  }

  if (body.watched !== undefined) {
    await movies.updateOne(
      { _id: existing._id },
      { $set: { watched: body.watched, watchedAt: body.watched ? Date.now() : null, pickedRandomly: false } }
    );
  }

  const updated = await movies.findOne({ _id: existing._id });
  if (!updated) return NextResponse.json({ error: "Movie not found." }, { status: 404 });

  const movie = toMovieDTO(updated);
  publish(householdId, { type: "movie-updated", movie });

  return NextResponse.json({ movie });
}

export async function DELETE(request: NextRequest, { params }: Params) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId, movieId } = await params;
  if (!ObjectId.isValid(movieId)) return NextResponse.json({ error: "Invalid movie id." }, { status: 400 });

  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const result = await db.collection<MovieDoc>("movies").deleteOne({ _id: new ObjectId(movieId), householdId });
  if (result.deletedCount === 0) return NextResponse.json({ error: "Movie not found." }, { status: 404 });

  publish(householdId, { type: "movie-removed", movieId });

  return NextResponse.json({ ok: true });
}
