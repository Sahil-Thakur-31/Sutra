"use client";

import { useEffect, useState, type ReactNode } from "react";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { UtilityCard, cardVariants } from "@/components/UtilityCard";
import {
  BasketIcon,
  ChecklistIcon,
  BellIcon,
  WalletIcon,
  FilmIcon,
  UtensilsIcon,
  CalendarDaysIcon,
  StickyNoteIcon,
  LockIcon,
  GiftIcon,
  FlameIcon,
  LuggageIcon,
  PiggyBankIcon,
  BookOpenIcon,
  LanguageIcon,
  BarChartIcon,
  SearchIcon,
} from "@/components/ui/icons";
import type {
  GroceryItemDTO,
  ChoreDTO,
  ReminderDTO,
  BalanceDTO,
  MovieDTO,
  MealDTO,
  CalendarEventDTO,
  NoteDTO,
  VaultEntryDTO,
  WishlistItemDTO,
  HabitDTO,
  TripDTO,
  FundDTO,
  RecipeDTO,
  WordDTO,
  PollDTO,
} from "@/lib/types";
import { weekStart } from "@/components/meals/WeekNav";
import { monthKey } from "@/components/grocery/MonthNav";

function greeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

interface UtilityConfig {
  key: string;
  title: string;
  description: string;
  icon: ReactNode;
  href: string;
  meta?: string;
  group: string;
}

const GROUP_ORDER = ["Daily", "Money", "Planning", "Together", "Communication", "Reference"];

export default function DashboardPage() {
  const { profile, household, loading } = useHousehold();
  const [search, setSearch] = useState("");
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [choresDueCount, setChoresDueCount] = useState<number | null>(null);
  const [remindersDueCount, setRemindersDueCount] = useState<number | null>(null);
  const [myBalance, setMyBalance] = useState<number | null>(null);
  const [movieCount, setMovieCount] = useState<number | null>(null);
  const [mealCount, setMealCount] = useState<number | null>(null);
  const [eventCount, setEventCount] = useState<number | null>(null);
  const [noteCount, setNoteCount] = useState<number | null>(null);
  const [vaultCount, setVaultCount] = useState<number | null>(null);
  const [wishlistCount, setWishlistCount] = useState<number | null>(null);
  const [habitCount, setHabitCount] = useState<number | null>(null);
  const [tripCount, setTripCount] = useState<number | null>(null);
  const [fundCount, setFundCount] = useState<number | null>(null);
  const [recipeCount, setRecipeCount] = useState<number | null>(null);
  const [wordCount, setWordCount] = useState<number | null>(null);
  const [openPollCount, setOpenPollCount] = useState<number | null>(null);

  useEffect(() => {
    if (!household) return;
    // The default (status=active) list is exactly the unpurchased items.
    fetch(`/api/households/${household.id}/items`)
      .then((res) => res.json())
      .then((data) => {
        const items: GroceryItemDTO[] = data.items ?? [];
        setPendingCount(items.length);
      })
      .catch(() => setPendingCount(null));

    fetch(`/api/households/${household.id}/chores`)
      .then((res) => res.json())
      .then((data) => {
        const chores: ChoreDTO[] = data.chores ?? [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setChoresDueCount(chores.filter((c) => c.dueDate <= today.getTime()).length);
      })
      .catch(() => setChoresDueCount(null));

    fetch(`/api/households/${household.id}/reminders`)
      .then((res) => res.json())
      .then((data) => {
        const reminders: ReminderDTO[] = data.reminders ?? [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setRemindersDueCount(reminders.filter((r) => r.dueDate <= today.getTime()).length);
      })
      .catch(() => setRemindersDueCount(null));

    fetch(`/api/households/${household.id}/bills/balances`)
      .then((res) => res.json())
      .then((data) => {
        const balances: BalanceDTO[] = data.balances ?? [];
        const mine = balances.find((b) => b.uid === profile?.uid);
        setMyBalance(mine?.netBalance ?? 0);
      })
      .catch(() => setMyBalance(null));

    fetch(`/api/households/${household.id}/movies`)
      .then((res) => res.json())
      .then((data) => {
        const movies: MovieDTO[] = data.movies ?? [];
        setMovieCount(movies.length);
      })
      .catch(() => setMovieCount(null));

    fetch(`/api/households/${household.id}/meals?week=${weekStart(new Date())}`)
      .then((res) => res.json())
      .then((data) => {
        const meals: MealDTO[] = data.meals ?? [];
        setMealCount(meals.length);
      })
      .catch(() => setMealCount(null));

    fetch(`/api/households/${household.id}/events?month=${monthKey(new Date())}`)
      .then((res) => res.json())
      .then((data) => {
        const events: CalendarEventDTO[] = data.events ?? [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        setEventCount(events.filter((e) => e.date >= today.getTime()).length);
      })
      .catch(() => setEventCount(null));

    fetch(`/api/households/${household.id}/notes`)
      .then((res) => res.json())
      .then((data) => setNoteCount(((data.notes ?? []) as NoteDTO[]).length))
      .catch(() => setNoteCount(null));

    fetch(`/api/households/${household.id}/vault`)
      .then((res) => res.json())
      .then((data) => setVaultCount(((data.entries ?? []) as VaultEntryDTO[]).length))
      .catch(() => setVaultCount(null));

    fetch(`/api/households/${household.id}/wishlist`)
      .then((res) => res.json())
      .then((data) => setWishlistCount(((data.items ?? []) as WishlistItemDTO[]).length))
      .catch(() => setWishlistCount(null));

    fetch(`/api/households/${household.id}/habits`)
      .then((res) => res.json())
      .then((data) => setHabitCount(((data.habits ?? []) as HabitDTO[]).length))
      .catch(() => setHabitCount(null));

    fetch(`/api/households/${household.id}/trips`)
      .then((res) => res.json())
      .then((data) => setTripCount(((data.trips ?? []) as TripDTO[]).length))
      .catch(() => setTripCount(null));

    fetch(`/api/households/${household.id}/funds`)
      .then((res) => res.json())
      .then((data) => setFundCount(((data.funds ?? []) as FundDTO[]).length))
      .catch(() => setFundCount(null));

    fetch(`/api/households/${household.id}/recipes`)
      .then((res) => res.json())
      .then((data) => setRecipeCount(((data.recipes ?? []) as RecipeDTO[]).length))
      .catch(() => setRecipeCount(null));

    fetch(`/api/households/${household.id}/words`)
      .then((res) => res.json())
      .then((data) => setWordCount(((data.words ?? []) as WordDTO[]).length))
      .catch(() => setWordCount(null));

    fetch(`/api/households/${household.id}/polls`)
      .then((res) => res.json())
      .then((data) => {
        const polls: PollDTO[] = data.polls ?? [];
        setOpenPollCount(polls.filter((p) => !p.closed).length);
      })
      .catch(() => setOpenPollCount(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [household]);

  if (loading || !profile || !household) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <AmbientBackground />
        <p className="text-sm text-fg-muted">Loading...</p>
      </div>
    );
  }

  const firstName = profile.name.split(" ")[0];

  const utilities: UtilityConfig[] = [
    {
      key: "grocery",
      title: "Grocery list",
      description: "Add items, translated for the whole family.",
      icon: <BasketIcon className="size-5" />,
      href: "/grocery",
      group: "Daily",
      meta:
        pendingCount === null ? undefined : pendingCount === 0 ? "All caught up" : `${pendingCount} item${pendingCount === 1 ? "" : "s"} to get`,
    },
    {
      key: "chores",
      title: "Chores",
      description: "Split housework and track who's doing what.",
      icon: <ChecklistIcon className="size-5" />,
      href: "/chores",
      group: "Daily",
      meta: choresDueCount === null ? undefined : choresDueCount === 0 ? "All caught up" : `${choresDueCount} due`,
    },
    {
      key: "meals",
      title: "Meal planner",
      description: "Plan the week's meals and see who's cooking.",
      icon: <UtensilsIcon className="size-5" />,
      href: "/meals",
      group: "Daily",
      meta: mealCount === null ? undefined : `${mealCount} planned this week`,
    },
    {
      key: "reminders",
      title: "Reminders",
      description: "Nudges for bills, birthdays, and more.",
      icon: <BellIcon className="size-5" />,
      href: "/reminders",
      group: "Daily",
      meta: remindersDueCount === null ? undefined : remindersDueCount === 0 ? "All caught up" : `${remindersDueCount} due`,
    },
    {
      key: "bills",
      title: "Bill splitting",
      description: "Track shared expenses and who owes what.",
      icon: <WalletIcon className="size-5" />,
      href: "/bills",
      group: "Money",
      meta:
        myBalance === null
          ? undefined
          : myBalance === 0
            ? "Settled up"
            : myBalance > 0
              ? `You're owed ₹${myBalance.toLocaleString("en-IN")}`
              : `You owe ₹${Math.abs(myBalance).toLocaleString("en-IN")}`,
    },
    {
      key: "funds",
      title: "Family fund",
      description: "Save together toward a shared goal.",
      icon: <PiggyBankIcon className="size-5" />,
      href: "/funds",
      group: "Money",
      meta: fundCount === null ? undefined : `${fundCount} goals`,
    },
    {
      key: "calendar",
      title: "Family calendar",
      description: "Appointments and events, all in one place.",
      icon: <CalendarDaysIcon className="size-5" />,
      href: "/calendar",
      group: "Planning",
      meta: eventCount === null ? undefined : `${eventCount} upcoming this month`,
    },
    {
      key: "trips",
      title: "Trip packing",
      description: "A packing checklist for every trip.",
      icon: <LuggageIcon className="size-5" />,
      href: "/trips",
      group: "Planning",
      meta: tripCount === null ? undefined : `${tripCount} trips`,
    },
    {
      key: "recipes",
      title: "Recipe box",
      description: "A shared cookbook, in everyone's language.",
      icon: <BookOpenIcon className="size-5" />,
      href: "/recipes",
      group: "Planning",
      meta: recipeCount === null ? undefined : `${recipeCount} recipes`,
    },
    {
      key: "movies",
      title: "Movie night",
      description: "Suggest, vote, and pick tonight's movie.",
      icon: <FilmIcon className="size-5" />,
      href: "/movies",
      group: "Together",
      meta: movieCount === null ? undefined : `${movieCount} suggested`,
    },
    {
      key: "polls",
      title: "Quick polls",
      description: "Decide something together, fast.",
      icon: <BarChartIcon className="size-5" />,
      href: "/polls",
      group: "Together",
      meta: openPollCount === null ? undefined : `${openPollCount} open`,
    },
    {
      key: "wishlist",
      title: "Gift wishlist",
      description: "Add gift ideas — reservations stay a surprise.",
      icon: <GiftIcon className="size-5" />,
      href: "/wishlist",
      group: "Together",
      meta: wishlistCount === null ? undefined : `${wishlistCount} wishes`,
    },
    {
      key: "habits",
      title: "Habits",
      description: "Track habits and keep your streaks alive.",
      icon: <FlameIcon className="size-5" />,
      href: "/habits",
      group: "Together",
      meta: habitCount === null ? undefined : `${habitCount} tracked`,
    },
    {
      key: "notes",
      title: "Notice board",
      description: "Pin quick notes for the family to see.",
      icon: <StickyNoteIcon className="size-5" />,
      href: "/notes",
      group: "Communication",
      meta: noteCount === null ? undefined : `${noteCount} pinned`,
    },
    {
      key: "words",
      title: "Word corner",
      description: "Teach the family a word in your language.",
      icon: <LanguageIcon className="size-5" />,
      href: "/words",
      group: "Communication",
      meta: wordCount === null ? undefined : `${wordCount} shared`,
    },
    {
      key: "vault",
      title: "Important info",
      description: "Contacts, Wi-Fi, and documents, saved safely.",
      icon: <LockIcon className="size-5" />,
      href: "/vault",
      group: "Reference",
      meta: vaultCount === null ? undefined : `${vaultCount} saved`,
    },
  ];

  const query = search.trim().toLowerCase();
  const filtered = query
    ? utilities.filter((u) => u.title.toLowerCase().includes(query) || u.description.toLowerCase().includes(query))
    : utilities;

  const groups = GROUP_ORDER.map((group) => ({
    group,
    items: filtered.filter((u) => u.group === group),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        memberCount={household.memberUids.length}
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-wrap items-end justify-between gap-4"
        >
          <div>
            <p className="text-sm font-medium text-accent">
              {greeting()}, {firstName}
            </p>
            <h2 className="mt-1 text-xl font-semibold text-fg sm:text-2xl">What are we taking care of today?</h2>
          </div>

          <div className="relative w-full max-w-sm sm:w-72">
            <SearchIcon className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-fg-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Find a utility..."
              className="w-full rounded-xl border border-border bg-bg-elevated py-2 pr-3 pl-9 text-sm text-fg outline-none transition-shadow placeholder:text-fg-subtle focus:border-accent/60 focus:ring-4 focus:ring-accent-soft"
            />
          </div>
        </motion.div>

        {groups.length === 0 ? (
          <p className="mt-6 text-sm text-fg-muted">No utilities match &quot;{search}&quot;.</p>
        ) : (
          groups.map((section, sectionIndex) => (
            <motion.section
              key={section.group}
              initial="hidden"
              animate="visible"
              variants={{ visible: { transition: { staggerChildren: 0.05, delayChildren: 0.1 + sectionIndex * 0.05 } } }}
              className="mt-6"
            >
              <h3 className="mb-3 text-xs font-semibold tracking-wide text-fg-subtle uppercase">{section.group}</h3>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                {section.items.map((u) => (
                  <UtilityCard
                    key={u.key}
                    title={u.title}
                    description={u.description}
                    icon={u.icon}
                    meta={u.meta}
                    href={u.href}
                    status="active"
                  />
                ))}
              </div>
            </motion.section>
          ))
        )}

        <motion.p
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="mt-10 text-center text-xs text-fg-subtle"
        >
          Sutra grows with your family — more utilities are on the way.
        </motion.p>
      </main>
    </div>
  );
}
