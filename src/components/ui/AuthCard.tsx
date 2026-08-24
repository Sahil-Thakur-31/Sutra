"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";
import { AmbientBackground } from "./AmbientBackground";
import { ThemeToggle } from "./ThemeToggle";

export function AuthCard({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="relative flex flex-1 items-center justify-center px-4 py-16">
      <AmbientBackground />
      <ThemeToggle className="absolute top-6 right-6" />
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="w-full max-w-sm rounded-3xl border border-border bg-bg-elevated/90 p-8 shadow-[0_1px_2px_rgb(var(--shadow-color)/0.08),0_24px_48px_-16px_rgb(var(--shadow-color)/0.25)] backdrop-blur-sm"
      >
        <div className="mb-1 inline-flex items-center gap-2 text-sm font-semibold tracking-wide text-accent">
          <span className="text-lg leading-none">✻</span> Sutra
        </div>
        <h1 className="text-2xl font-semibold text-fg">{title}</h1>
        <p className="mt-1 text-sm text-fg-muted">{subtitle}</p>

        <div className="mt-6">{children}</div>

        {footer && <div className="mt-6 text-center text-sm text-fg-muted">{footer}</div>}
      </motion.div>
    </div>
  );
}
