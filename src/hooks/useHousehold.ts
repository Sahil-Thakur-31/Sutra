"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import type { HouseholdDTO } from "@/lib/types";

/** Guards a page behind "signed in + belongs to a household," redirecting otherwise, and loads the household doc. */
export function useHousehold() {
  const router = useRouter();
  const { profile, loading: authLoading } = useAuth();
  const [household, setHousehold] = useState<HouseholdDTO | null>(null);
  const [householdLoading, setHouseholdLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!profile) {
      router.replace("/login");
      return;
    }
    if (!profile.householdId) {
      router.replace("/household/setup");
    }
  }, [authLoading, profile, router]);

  useEffect(() => {
    if (!profile?.householdId) return;
    let cancelled = false;

    // householdId is effectively immutable for the life of a session (no
    // household-switching feature), so `householdLoading` only needs its
    // initial `true` value -- no synchronous reset needed here.
    fetch(`/api/households/${profile.householdId}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setHousehold(data.household ?? null);
        setHouseholdLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.householdId]);

  return {
    profile,
    household,
    loading: authLoading || (!!profile?.householdId && householdLoading),
  };
}
