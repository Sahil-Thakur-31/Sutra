"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { useAuth } from "@/contexts/AuthContext";
import { Avatar } from "./Avatar";
import { ChevronDownIcon, UsersIcon, GearIcon, LogoutIcon } from "./icons";

export function UserMenu() {
  const { profile, signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function handlePointerDown(e: PointerEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  if (!profile) return null;

  return (
    <div ref={rootRef} className="relative">
      <motion.button
        whileTap={{ scale: 0.96 }}
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full border border-border bg-bg-elevated py-1 pl-1 pr-2.5 transition-colors hover:border-accent/40"
      >
        <Avatar name={profile.name} className="size-7" />
        <span className="hidden text-sm font-medium text-fg sm:inline">{profile.name.split(" ")[0]}</span>
        <ChevronDownIcon className={`size-3.5 text-fg-subtle transition-transform ${open ? "rotate-180" : ""}`} />
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            role="menu"
            className="absolute right-0 z-20 mt-2 w-56 overflow-hidden rounded-2xl border border-border bg-bg-elevated shadow-[0_1px_2px_rgb(var(--shadow-color)/0.08),0_16px_32px_-12px_rgb(var(--shadow-color)/0.3)]"
          >
            <div className="border-b border-border px-4 py-3">
              <p className="truncate text-sm font-medium text-fg">{profile.name}</p>
              <p className="truncate text-xs text-fg-muted">{profile.email ?? profile.phone}</p>
            </div>
            <div className="p-1.5">
              <Link
                href="/profile"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg transition-colors hover:bg-accent-soft/50"
              >
                <UsersIcon className="size-4 text-fg-muted" />
                Profile &amp; Family
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-fg transition-colors hover:bg-accent-soft/50"
              >
                <GearIcon className="size-4 text-fg-muted" />
                Settings
              </Link>
            </div>
            <div className="border-t border-border p-1.5">
              <button
                role="menuitem"
                onClick={() => {
                  setOpen(false);
                  signOut();
                }}
                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-sm text-danger transition-colors hover:bg-danger-soft"
              >
                <LogoutIcon className="size-4" />
                Sign out
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
