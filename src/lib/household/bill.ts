import type { WithId } from "mongodb";
import type { BillDTO, BalanceDTO, BillKind } from "@/lib/types";

export interface BillDoc {
  householdId: string;
  kind: BillKind;
  description: string;
  originalLang: string;
  translations: Record<string, string>;
  amount: number;
  category: string | null;
  paidByUid: string | null;
  paidByName: string | null;
  splitAmong: string[] | null;
  fromUid: string | null;
  fromName: string | null;
  toUid: string | null;
  toName: string | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export function toBillDTO(doc: WithId<BillDoc>): BillDTO {
  return {
    id: doc._id.toHexString(),
    kind: doc.kind,
    description: doc.description,
    originalLang: doc.originalLang,
    translations: doc.translations,
    amount: doc.amount,
    category: doc.category,
    paidByUid: doc.paidByUid,
    paidByName: doc.paidByName,
    splitAmong: doc.splitAmong,
    fromUid: doc.fromUid,
    fromName: doc.fromName,
    toUid: doc.toUid,
    toName: doc.toName,
    createdByUid: doc.createdByUid,
    createdByName: doc.createdByName,
    createdAt: doc.createdAt,
  };
}

/**
 * Net balance per member, relative to the shared pool: positive means the
 * household collectively owes them (they fronted more than their share),
 * negative means they owe the household. This is a simplification of full
 * pairwise debts -- exact for two-member households, an aggregate summary
 * for larger ones.
 */
export function computeBalances(bills: BillDoc[], members: { uid: string; name: string }[]): BalanceDTO[] {
  const balance = new Map(members.map((m) => [m.uid, 0]));

  for (const bill of bills) {
    if (bill.kind === "expense" && bill.paidByUid && bill.splitAmong && bill.splitAmong.length > 0) {
      const share = bill.amount / bill.splitAmong.length;
      balance.set(bill.paidByUid, (balance.get(bill.paidByUid) ?? 0) + bill.amount);
      for (const uid of bill.splitAmong) {
        balance.set(uid, (balance.get(uid) ?? 0) - share);
      }
    } else if (bill.kind === "settlement" && bill.fromUid && bill.toUid) {
      balance.set(bill.fromUid, (balance.get(bill.fromUid) ?? 0) + bill.amount);
      balance.set(bill.toUid, (balance.get(bill.toUid) ?? 0) - bill.amount);
    }
  }

  return members.map((m) => ({ uid: m.uid, name: m.name, netBalance: Math.round((balance.get(m.uid) ?? 0) * 100) / 100 }));
}
