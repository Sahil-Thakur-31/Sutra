import type { WithId } from "mongodb";
import type { WishlistItemDTO } from "@/lib/types";

export interface WishlistItemDoc {
  householdId: string;
  ownerUid: string;
  ownerName: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  url: string | null;
  reservedByUid: string | null;
  reservedByName: string | null;
  createdAt: number;
}

export function toWishlistItemDTO(doc: WithId<WishlistItemDoc>): WishlistItemDTO {
  return {
    id: doc._id.toHexString(),
    ownerUid: doc.ownerUid,
    ownerName: doc.ownerName,
    title: doc.title,
    originalLang: doc.originalLang,
    translations: doc.translations,
    url: doc.url,
    reservedByUid: doc.reservedByUid,
    reservedByName: doc.reservedByName,
    createdAt: doc.createdAt,
  };
}

/** Strips reservation state when `viewerUid` is the item's own owner. */
export function redactForViewer(item: WishlistItemDTO, viewerUid: string): WishlistItemDTO {
  if (item.ownerUid !== viewerUid) return item;
  return { ...item, reservedByUid: null, reservedByName: null };
}
