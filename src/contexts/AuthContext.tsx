"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { UserProfileDTO } from "@/lib/types";

interface AuthContextValue {
  profile: UserProfileDTO | null;
  loading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// `undefined` = not yet fetched, `null` = fetched, signed out.
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<UserProfileDTO | null | undefined>(undefined);

  const refreshProfile = useCallback(async () => {
    const res = await fetch("/api/auth/me");
    const data = await res.json();
    setProfile(data.profile ?? null);
  }, []);

  useEffect(() => {
    // Hydrating from the session cookie on mount; the setState happens after
    // the fetch resolves, not synchronously, so this isn't a render loop.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshProfile();
  }, [refreshProfile]);

  const signOut = useCallback(async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    setProfile(null);
  }, []);

  const value: AuthContextValue = {
    profile: profile ?? null,
    loading: profile === undefined,
    refreshProfile,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
