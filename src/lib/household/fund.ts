import type { WithId } from "mongodb";
import type { FundDTO, ContributionDTO } from "@/lib/types";

export interface FundDoc {
  householdId: string;
  name: string;
  originalLang: string;
  translations: Record<string, string>;
  targetAmount: number;
  currency: string;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toFundDTO(doc: WithId<FundDoc>, totalSaved: number): FundDTO {
  return {
    id: doc._id.toHexString(),
    name: doc.name,
    originalLang: doc.originalLang,
    translations: doc.translations,
    targetAmount: doc.targetAmount,
    currency: doc.currency,
    totalSaved,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}

export interface ContributionDoc {
  householdId: string;
  fundId: string;
  amount: number;
  note: string | null;
  contributedByUid: string;
  contributedByName: string;
  createdAt: number;
}

export function toContributionDTO(doc: WithId<ContributionDoc>): ContributionDTO {
  return {
    id: doc._id.toHexString(),
    fundId: doc.fundId,
    amount: doc.amount,
    note: doc.note,
    contributedByUid: doc.contributedByUid,
    contributedByName: doc.contributedByName,
    createdAt: doc.createdAt,
  };
}
