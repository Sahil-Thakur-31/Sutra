"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowRightIcon, CopyIcon, UsersIcon } from "./icons";
import { ThemeToggle } from "./ThemeToggle";
import { UserMenu } from "./UserMenu";

export function AppHeader({
  householdName,
  inviteCode,
  backHref,
  pageTitle,
  memberCount,
}: {
  householdName: string;
  inviteCode: string;
  backHref?: string;
  pageTitle?: string;
  memberCount?: number;
}) {
  const [copied, setCopied] = useState(false);

  async function copyCode() {
    try {
      await navigator.clipboard.writeText(inviteCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API unavailable; nothing to do
    }
  }

  return (
    <header className="sticky top-0 z-10 border-b border-border/70 bg-bg/80 backdrop-blur-md">
      <div className="flex w-full items-center justify-between px-6 py-4 lg:px-10">
        <div className="flex items-center gap-3">
          {backHref && (
            <Link
              href={backHref}
              className="flex items-center gap-1.5 rounded-full border border-border bg-bg-elevated py-1.5 pr-3 pl-2.5 text-sm font-medium text-fg-muted transition-colors hover:border-accent/40 hover:bg-accent-soft hover:text-accent"
              aria-label="Back to dashboard"
            >
              <ArrowRightIcon className="size-4 rotate-180" />
              <span className="hidden sm:inline">Dashboard</span>
            </Link>
          )}
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold text-fg">{pageTitle ?? householdName}</h1>
              {!pageTitle && memberCount !== undefined && (
                <span className="flex items-center gap-1 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
                  <UsersIcon className="size-3" />
                  {memberCount}
                </span>
              )}
            </div>
            {pageTitle ? (
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-xs text-fg-muted transition-colors hover:text-accent"
              >
                {householdName} · {copied ? "Copied!" : `Invite ${inviteCode}`}
              </button>
            ) : (
              <button
                onClick={copyCode}
                className="flex items-center gap-1 text-xs text-fg-muted transition-colors hover:text-accent"
              >
                <CopyIcon className="size-3" />
                {copied ? "Copied!" : `Invite code ${inviteCode}`}
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
