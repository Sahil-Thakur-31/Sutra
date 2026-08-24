"use client";

import { motion } from "framer-motion";
import { useTheme, type Theme } from "@/contexts/ThemeContext";
import { SunIcon, MoonIcon, MonitorIcon } from "./icons";

const OPTIONS: { value: Theme; label: string; icon: typeof SunIcon }[] = [
  { value: "light", label: "Light theme", icon: SunIcon },
  { value: "system", label: "Match system theme", icon: MonitorIcon },
  { value: "dark", label: "Dark theme", icon: MoonIcon },
];

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { theme, setTheme } = useTheme();

  return (
    <div className={`inline-flex items-center rounded-full border border-border bg-bg p-1 ${className}`}>
      {OPTIONS.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          type="button"
          aria-label={label}
          aria-pressed={theme === value}
          onClick={() => setTheme(value)}
          className="relative flex size-7 items-center justify-center rounded-full"
        >
          {theme === value && (
            <motion.span
              layoutId="theme-toggle-pill"
              className="absolute inset-0 rounded-full bg-accent-soft"
              transition={{ type: "spring", stiffness: 500, damping: 35 }}
            />
          )}
          <Icon className={`relative size-3.5 ${theme === value ? "text-accent" : "text-fg-subtle"}`} />
        </button>
      ))}
    </div>
  );
}
