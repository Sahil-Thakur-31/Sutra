"use client";

import { motion } from "framer-motion";

export function Checkbox({ checked, onChange }: { checked: boolean; onChange: () => void }) {
  return (
    <motion.button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      whileTap={{ scale: 0.88 }}
      className={`flex size-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-200 ${
        checked ? "border-sage bg-sage" : "border-border bg-bg hover:border-accent/50"
      }`}
    >
      <svg viewBox="0 0 24 24" className="size-3">
        <motion.path
          d="M5 12.5 9.5 17 19 7"
          fill="none"
          stroke="var(--color-accent-fg)"
          strokeWidth={3}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0, opacity: checked ? 1 : 0 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        />
      </svg>
    </motion.button>
  );
}
