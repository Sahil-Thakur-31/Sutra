import { NextResponse, type NextRequest } from "next/server";
import { ObjectId } from "mongodb";
import { getDb } from "@/lib/mongo/client";
import { getUidFromRequest } from "@/lib/auth/session";
import { requireMembership } from "@/lib/household/membership";
import { publish } from "@/lib/realtime/broadcaster";
import { toMovieDTO, type MovieDoc } from "@/lib/household/movie";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  const status = request.nextUrl.searchParams.get("status") === "watched" ? "watched" : "active";
  const docs = await db
    .collection<MovieDoc>("movies")
    .find({ householdId, watched: status === "watched" })
    .sort(status === "active" ? { createdAt: -1 } : { watchedAt: -1 })
    .toArray();

  return NextResponse.json({ movies: docs.map(toMovieDTO) });
}

interface CreateMovieBody {
  title: string;
  originalLang: string;
  translations: Record<string, string>;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const uid = getUidFromRequest(request);
  if (!uid) return NextResponse.json({ error: "Not signed in." }, { status: 401 });

  const { id: householdId } = await params;
  const db = await getDb();
  const household = await requireMembership(db, householdId, uid);
  if (!household) return NextResponse.json({ error: "Household not found." }, { status: 404 });

  let body: CreateMovieBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const title = body.title?.trim();
  if (!title) return NextResponse.json({ error: "Movie title is required." }, { status: 400 });

  const userDoc = await db.collection("users").findOne({ _id: new ObjectId(uid) });
  if (!userDoc) return NextResponse.json({ error: "User not found." }, { status: 404 });

  const newDoc: MovieDoc = {
    householdId,
    title,
    originalLang: body.originalLang,
    translations: body.translations ?? {},
    addedByUid: uid,
    addedByName: userDoc.name,
    votes: [],
    watched: false,
    watchedAt: null,
    pickedRandomly: false,
    createdAt: Date.now(),
  };

  const insertResult = await db.collection<MovieDoc>("movies").insertOne(newDoc);
  const movie = toMovieDTO({ _id: insertResult.insertedId, ...newDoc });

  publish(householdId, { type: "movie-added", movie });

  return NextResponse.json({ movie });
}
