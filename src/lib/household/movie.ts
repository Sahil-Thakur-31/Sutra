import type { WithId } from "mongodb";
import type { MovieDTO } from "@/lib/types";

export interface MovieDoc {
  householdId: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  addedByUid: string;
  addedByName: string;
  votes: string[];
  watched: boolean;
  watchedAt: number | null;
  pickedRandomly: boolean;
  createdAt: number;
}

export function toMovieDTO(doc: WithId<MovieDoc>): MovieDTO {
  return {
    id: doc._id.toHexString(),
    title: doc.title,
    originalLang: doc.originalLang,
    translations: doc.translations,
    addedByUid: doc.addedByUid,
    addedByName: doc.addedByName,
    votes: doc.votes,
    watched: doc.watched,
    watchedAt: doc.watchedAt,
    pickedRandomly: doc.pickedRandomly,
    createdAt: doc.createdAt,
  };
}

/** Weighted-random pick: more votes increase the odds without guaranteeing the win. */
export function weightedRandomPick(movies: WithId<MovieDoc>[]): WithId<MovieDoc> {
  const weights = movies.map((m) => 1 + m.votes.length);
  const total = weights.reduce((a, b) => a + b, 0);
  let roll = Math.random() * total;
  for (let i = 0; i < movies.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return movies[i];
  }
  return movies[movies.length - 1];
}
