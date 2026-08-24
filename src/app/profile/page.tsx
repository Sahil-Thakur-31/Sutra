"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { useHousehold } from "@/hooks/useHousehold";
import { AppHeader } from "@/components/ui/AppHeader";
import { AmbientBackground } from "@/components/ui/AmbientBackground";
import { Avatar } from "@/components/ui/Avatar";
import { GearIcon, CakeIcon } from "@/components/ui/icons";

interface Member {
  uid: string;
  name: string;
  preferredLanguage: string;
}

function formatDob(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function ProfilePage() {
  const { profile, household, loading } = useHousehold();
  const [members, setMembers] = useState<Member[]>([]);
  const [membersLoading, setMembersLoading] = useState(true);

  useEffect(() => {
    if (!household) return;
    fetch(`/api/households/${household.id}/members`)
      .then((res) => res.json())
      .then((data) => {
        setMembers(data.members ?? []);
        setMembersLoading(false);
      });
  }, [household]);

  if (loading || !profile || !household) {
    return (
      <div className="relative flex flex-1 items-center justify-center">
        <AmbientBackground />
        <p className="text-sm text-fg-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="relative flex flex-1 flex-col">
      <AmbientBackground />
      <AppHeader
        householdName={household.name}
        inviteCode={household.inviteCode}
        backHref="/"
        pageTitle="Profile & family"
      />

      <main className="w-full flex-1 px-6 py-6 lg:px-10">
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px]">
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="rounded-2xl border border-border bg-bg-elevated p-6"
          >
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium text-fg-muted">You</h3>
              <Link
                href="/profile/edit"
                className="flex items-center gap-1.5 text-xs font-medium text-accent hover:text-accent-hover"
              >
                <GearIcon className="size-3.5" /> Edit
              </Link>
            </div>

            <div className="mt-4 flex items-center gap-5">
              <Avatar name={profile.name} photoUrl={profile.photoUrl} className="size-20 shrink-0 text-2xl" />
              <div className="min-w-0">
                <p className="truncate text-lg font-semibold text-fg">{profile.name}</p>
                {profile.email && <p className="truncate text-sm text-fg-muted">{profile.email}</p>}
                {profile.phone && <p className="truncate text-sm text-fg-muted">{profile.phone}</p>}
              </div>
            </div>

            {(profile.dateOfBirth || profile.gender) && (
              <div className="mt-6 grid grid-cols-1 gap-3 border-t border-border pt-5 sm:grid-cols-2">
                {profile.dateOfBirth && (
                  <div className="flex items-center gap-2 text-sm text-fg-muted">
                    <CakeIcon className="size-4 text-fg-subtle" />
                    {formatDob(profile.dateOfBirth)}
                  </div>
                )}
                {profile.gender && <div className="text-sm text-fg-muted">{profile.gender}</div>}
              </div>
            )}
          </motion.section>

          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="rounded-2xl border border-border bg-bg-elevated p-6"
          >
            <h3 className="text-sm font-medium text-fg-muted">
              Family members {!membersLoading && `(${members.length})`}
            </h3>
            <ul className="mt-4 flex flex-col gap-4">
              {membersLoading
                ? [0, 1].map((i) => <div key={i} className="h-10 animate-shimmer rounded-xl" />)
                : members.map((member) => (
                    <li key={member.uid} className="flex items-center gap-3">
                      <Avatar name={member.name} className="size-10" />
                      <p className="min-w-0 flex-1 truncate text-sm font-medium text-fg">
                        {member.name}
                        {member.uid === profile.uid && <span className="text-fg-muted"> (you)</span>}
                      </p>
                    </li>
                  ))}
            </ul>
          </motion.section>
        </div>
      </main>
    </div>
  );
}
