import { ObjectId, type Db, type WithId, type Document } from "mongodb";

/** Returns the household doc if `uid` is a member of `householdId`, else null. */
export async function requireMembership(
  db: Db,
  householdId: string,
  uid: string
): Promise<WithId<Document> | null> {
  if (!ObjectId.isValid(householdId)) return null;
  const household = await db.collection("households").findOne({ _id: new ObjectId(householdId) });
  if (!household || !household.memberUids.includes(uid)) return null;
  return household;
}
