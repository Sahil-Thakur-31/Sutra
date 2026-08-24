"use client";

import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import { ArrowRightIcon } from "@/components/ui/icons";

export const cardVariants: Variants = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 300, damping: 28 } },
};

interface UtilityCardProps {
  title: string;
  description: string;
  icon: ReactNode;
  meta?: string;
  href?: string;
  status?: "active" | "soon";
}

export function UtilityCard({ title, description, icon, meta, href, status = "active" }: UtilityCardProps) {
  const isActive = status === "active" && href;

  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-accent-soft text-accent">
          {icon}
        </div>
        <div className="flex min-w-0 items-center gap-1.5">
          {status === "soon" ? (
            <span className="shrink-0 rounded-full bg-bg px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-fg-subtle">
              Coming soon
            </span>
          ) : (
            meta && (
              <span className="min-w-0 truncate rounded-full bg-accent-soft px-2.5 py-1 text-[11px] font-medium whitespace-nowrap text-accent">
                {meta}
              </span>
            )
          )}
          {status !== "soon" && (
            <span className="flex size-8 shrink-0 items-center justify-center rounded-full text-fg-subtle transition-colors group-hover:bg-accent group-hover:text-accent-fg">
              <ArrowRightIcon className="size-4" />
            </span>
          )}
        </div>
      </div>
      <h3 className="mt-4 truncate text-base font-semibold text-fg">{title}</h3>
      <p className="mt-1 truncate text-sm text-fg-muted">{description}</p>
    </>
  );

  const className = `group relative flex h-full flex-col rounded-3xl border border-border p-5 transition-colors ${
    isActive ? "bg-bg-elevated hover:border-accent/40" : "bg-bg-elevated/40 opacity-70"
  }`;

  if (isActive) {
    return (
      <motion.div
        variants={cardVariants}
        whileHover={{ y: -3 }}
        transition={{ type: "spring", stiffness: 400, damping: 25 }}
        className="h-full"
      >
        <Link href={href} className={className}>
          {content}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div variants={cardVariants} className={className}>
      {content}
    </motion.div>
  );
}
