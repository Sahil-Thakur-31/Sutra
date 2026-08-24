// Public-safe shapes returned from API routes to the client (ids as hex
// strings, no password hashes). Mongo document shapes live next to the
// queries that use them in each route handler.

export interface UserProfileDTO {
  uid: string;
  name: string;
  email: string | null;
  phone: string | null;
  preferredLanguage: string;
  householdId: string | null;
  photoUrl: string | null;
  dateOfBirth: string | null;
  gender: string | null;
}

export interface HouseholdDTO {
  id: string;
  name: string;
  memberUids: string[];
  memberLanguages: Record<string, string>;
  inviteCode: string;
  createdBy: string;
  createdAt: number;
}

export interface GroceryItemDTO {
  id: string;
  originalText: string;
  originalLang: string;
  translations: Record<string, string>;
  quantity: number;
  unit: string;
  category: string;
  note: string | null;
  noteTranslations: Record<string, string> | null;
  addedByUid: string;
  addedByName: string;
  purchasedAt: number | null;
  purchasedByUid: string | null;
  createdAt: number;
}

export interface ItemSuggestionDTO {
  originalText: string;
  originalLang: string;
  quantity: number;
  unit: string;
  category: string;
}

export type ChoreRecurrence = "once" | "daily" | "weekly";

export interface ChoreDTO {
  id: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  recurrence: ChoreRecurrence;
  assigneeUid: string | null;
  assigneeName: string | null;
  dueDate: number;
  status: "pending" | "done";
  completedByUid: string | null;
  completedByName: string | null;
  completedAt: number | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export interface ChoreCompletionDTO {
  id: string;
  choreId: string;
  title: string;
  translations: Record<string, string>;
  completedByUid: string;
  completedByName: string;
  completedAt: number;
}

export type ReminderRecurrence = "once" | "weekly" | "monthly" | "yearly";
export type ReminderKind = "bill" | "birthday" | "appointment" | "other";

export interface ReminderDTO {
  id: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  kind: ReminderKind;
  recurrence: ReminderRecurrence;
  dueDate: number;
  status: "pending" | "done";
  dismissedByUid: string | null;
  dismissedByName: string | null;
  dismissedAt: number | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export interface ReminderLogDTO {
  id: string;
  reminderId: string;
  title: string;
  translations: Record<string, string>;
  dismissedByUid: string;
  dismissedByName: string;
  dismissedAt: number;
}

export type BillKind = "expense" | "settlement";

export interface BillDTO {
  id: string;
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

export interface BalanceDTO {
  uid: string;
  name: string;
  netBalance: number;
}

export interface MovieDTO {
  id: string;
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

export type MealType = "breakfast" | "lunch" | "dinner";

export interface MealDTO {
  id: string;
  date: number;
  mealType: MealType;
  description: string;
  originalLang: string;
  translations: Record<string, string>;
  assignedToUid: string | null;
  assignedToName: string | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export interface CalendarEventDTO {
  id: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  date: number;
  time: string | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export interface NoteDTO {
  id: string;
  text: string;
  originalLang: string;
  translations: Record<string, string>;
  color: string;
  pinned: boolean;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export interface VaultEntryDTO {
  id: string;
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

export interface WishlistItemDTO {
  id: string;
  ownerUid: string;
  ownerName: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  url: string | null;
  // Always null/false when the caller is the owner -- reservation state is
  // redacted server-side (both on fetch and over the realtime stream) so a
  // gift-giver's claim never leaks back to the person receiving the gift.
  reservedByUid: string | null;
  reservedByName: string | null;
  createdAt: number;
}

export interface HabitDTO {
  id: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  ownerUid: string;
  ownerName: string;
  recentCheckins: number[];
  currentStreak: number;
  createdAt: number;
}

export interface TripDTO {
  id: string;
  name: string;
  originalLang: string;
  translations: Record<string, string>;
  startDate: number | null;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export interface PackingItemDTO {
  id: string;
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

export interface FundDTO {
  id: string;
  name: string;
  originalLang: string;
  translations: Record<string, string>;
  targetAmount: number;
  currency: string;
  totalSaved: number;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}

export interface ContributionDTO {
  id: string;
  fundId: string;
  amount: number;
  note: string | null;
  contributedByUid: string;
  contributedByName: string;
  createdAt: number;
}

export interface WordDTO {
  id: string;
  phrase: string;
  originalLang: string;
  translations: Record<string, string>;
  addedByUid: string;
  addedByName: string;
  learnedByUids: string[];
  createdAt: number;
}

export interface RecipeDTO {
  id: string;
  title: string;
  originalLang: string;
  translations: Record<string, string>;
  ingredients: string;
  ingredientsTranslations: Record<string, string>;
  steps: string;
  stepsTranslations: Record<string, string>;
  addedByUid: string;
  addedByName: string;
  createdAt: number;
}

export interface PollOption {
  id: string;
  text: string;
  translations: Record<string, string>;
  voterUids: string[];
}

export interface PollDTO {
  id: string;
  question: string;
  originalLang: string;
  translations: Record<string, string>;
  options: PollOption[];
  closed: boolean;
  createdByUid: string;
  createdByName: string;
  createdAt: number;
}
