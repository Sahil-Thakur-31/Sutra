import { NextResponse, type NextRequest } from "next/server";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toMovieDTO, weightedRandomPick, type MovieDoc } from "@/lib/household/movie";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const movies = db.collection<MovieDoc>("movies");
  const active = await movies.find({ householdId, watched: false }).toArray();
  if (active.length === 0) return NextResponse.json({ error: "Add some movies to pick from first." }, { status: 400 });

  const winner = weightedRandomPick(active);
  await movies.updateOne({ _id: winner._id }, { $set: { watched: true, watchedAt: Date.now(), pickedRandomly: true } });

  const updated = await movies.findOne({ _id: winner._id });
  if (!updated) return NextResponse.json({ error: "Movie not found." }, { status: 404 });

  const movie = toMovieDTO(updated);
  publish(householdId, { type: "movie-updated", movie });

  return NextResponse.json({ movie });
}
