import type {
  GroceryItemDTO,
  ChoreDTO,
  ReminderDTO,
  BillDTO,
  MovieDTO,
  MealDTO,
  CalendarEventDTO,
  NoteDTO,
  VaultEntryDTO,
  WishlistItemDTO,
  HabitDTO,
  PollDTO,
} from "@/lib/types";

export type GroceryEvent =
  | { type: "item-added"; item: GroceryItemDTO }
  | { type: "item-updated"; item: GroceryItemDTO }
  | { type: "item-removed"; itemId: string };

export type ChoreEvent =
  | { type: "chore-added"; chore: ChoreDTO }
  | { type: "chore-updated"; chore: ChoreDTO }
  | { type: "chore-removed"; choreId: string };

export type ReminderEvent =
  | { type: "reminder-added"; reminder: ReminderDTO }
  | { type: "reminder-updated"; reminder: ReminderDTO }
  | { type: "reminder-removed"; reminderId: string };

export type BillEvent = { type: "bill-added"; bill: BillDTO } | { type: "bill-removed"; billId: string };

export type MovieEvent =
  | { type: "movie-added"; movie: MovieDTO }
  | { type: "movie-updated"; movie: MovieDTO }
  | { type: "movie-removed"; movieId: string };

export type MealEvent = { type: "meal-added"; meal: MealDTO } | { type: "meal-removed"; mealId: string };

export type CalendarEventEvent =
  | { type: "event-added"; event: CalendarEventDTO }
  | { type: "event-removed"; eventId: string };

export type NoteEvent =
  | { type: "note-added"; note: NoteDTO }
  | { type: "note-updated"; note: NoteDTO }
  | { type: "note-removed"; noteId: string };

export type VaultEvent =
  | { type: "vault-added"; entry: VaultEntryDTO }
  | { type: "vault-removed"; entryId: string };

// Carries the UNREDACTED item -- the stream route (which knows the
// connection's uid) is responsible for redacting reservation state before
// forwarding to an SSE client who is that item's owner.
export type WishlistEvent =
  | { type: "wishlist-added"; item: WishlistItemDTO }
  | { type: "wishlist-updated"; item: WishlistItemDTO }
  | { type: "wishlist-removed"; itemId: string };

export type HabitEvent =
  | { type: "habit-added"; habit: HabitDTO }
  | { type: "habit-updated"; habit: HabitDTO }
  | { type: "habit-removed"; habitId: string };

export type PollEvent =
  | { type: "poll-added"; poll: PollDTO }
  | { type: "poll-updated"; poll: PollDTO }
  | { type: "poll-removed"; pollId: string };

// One SSE stream per household carries every domain's events -- the client
// filters by `type`. Add new domains' event unions here as they're built.
export type HouseholdEvent =
  | GroceryEvent
  | ChoreEvent
  | ReminderEvent
  | BillEvent
  | MovieEvent
  | MealEvent
  | CalendarEventEvent
  | NoteEvent
  | VaultEvent
  | WishlistEvent
  | HabitEvent
  | PollEvent;

type Listener = (event: HouseholdEvent) => void;

declare global {
  var _groceryListeners: Map<string, Set<Listener>> | undefined;
}

// Module-level (process-wide) pub/sub, keyed by householdId. Good enough for
// a single-instance deployment; a multi-instance deployment would need a
// shared broker (e.g. Redis pub/sub) instead.
const listeners: Map<string, Set<Listener>> = global._groceryListeners ?? new Map();
global._groceryListeners = listeners;

export function subscribe(householdId: string, listener: Listener): () => void {
  let set = listeners.get(householdId);
  if (!set) {
    set = new Set();
    listeners.set(householdId, set);
  }
  set.add(listener);
  return () => {
    set!.delete(listener);
    if (set!.size === 0) listeners.delete(householdId);
  };
}

export function publish(householdId: string, event: HouseholdEvent): void {
  for (const listener of listeners.get(householdId) ?? []) {
    listener(event);
  }
}
