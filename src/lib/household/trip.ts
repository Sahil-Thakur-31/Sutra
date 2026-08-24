import type { WithId } from "mongodb";
import type { TripDTO, PackingItemDTO } from "@/lib/types";

export interface TripDoc {
  householdId: string;
  name: string;
  originalLang: string;
  translations: Record<string, string>;
  startDate: number | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toTripDTO(doc: WithId<TripDoc>): TripDTO {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    originalLang: doc.originalLang,
    translations: doc.translations,
    startDate: doc.startDate,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}

export interface PackingItemDoc {
  householdId: string;
  tripId: string;
  text: string;
  originalLang: string;
  translations: Record<string, string>;
  packed: boolean;
  packedByUid: string | null;
  addedByUid: string;
  addedByName: string;
  createdAt: number;
}

export function toPackingItemDTO(doc: WithId<PackingItemDoc>): PackingItemDTO {
  return {
    id: doc._id.toHexString(),
    tripId: doc.tripId,
    text: doc.text,
    originalLang: doc.originalLang,
    translations: doc.translations,
    packed: doc.packed,
    packedByUid: doc.packedByUid,
    addedByUid: doc.addedByUid,
    addedByName: doc.addedByName,
    createdAt: doc.createdAt,
  };
}
