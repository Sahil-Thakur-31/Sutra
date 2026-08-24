import { categoryLabel, categoryColorVar } from "@/lib/groceryMeta";

export function CategoryChip({ category, className = "" }: { category: string; className?: string }) {
  const colorVar = categoryColorVar(category);
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium whitespace-nowrap ${className}`}
      style={{ color: `var(--color-${colorVar})`, backgroundColor: `var(--color-${colorVar}-soft)` }}
    >
      {categoryLabel(category)}
    </span>
  );
}

export function CategoryFilterChip({
  category,
  active,
  onClick,
}: {
  category: string;
  active: boolean;
  onClick: () => void;
}) {
  const colorVar = categoryColorVar(category);
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex shrink-0 items-center rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap transition-all"
      style={
        active
          ? {
              color: `var(--color-${colorVar})`,
              backgroundColor: `var(--color-${colorVar}-soft)`,
              borderColor: `var(--color-${colorVar})`,
            }
          : { color: "var(--color-fg-muted)", backgroundColor: "transparent", borderColor: "var(--color-border)" }
      }
    >
      {categoryLabel(category)}
    </button>
  );
}
