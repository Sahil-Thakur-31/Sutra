import type { WithId } from "mongodb";
import type { VaultEntryDTO } from "@/lib/types";

export interface VaultEntryDoc {
  householdId: string;
  label: string;
  originalLang: string;
  translations: Record<string, string>;
  value: string;
  category: string;
  sensitive: boolean;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toVaultEntryDTO(doc: WithId<VaultEntryDoc>): VaultEntryDTO {
  return {
    id: doc._id.toHexString(),
    label: doc.label,
    originalLang: doc.originalLang,
    translations: doc.translations,
    value: doc.value,
    category: doc.category,
    sensitive: doc.sensitive,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}
