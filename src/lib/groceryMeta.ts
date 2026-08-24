export const UNITS = ["pcs", "kg", "g", "L", "ml", "pack", "dozen", "box", "bottle", "bunch"] as const;
export type Unit = (typeof UNITS)[number];

export interface CategoryMeta {
  value: string;
  label: string;
  colorVar: string; // maps to a --color-cat-* (or existing) token pair
}

export const CATEGORIES: CategoryMeta[] = [
  { value: "produce", label: "Produce", colorVar: "sage" },
  { value: "dairy", label: "Dairy", colorVar: "cat-blue" },
  { value: "bakery", label: "Bakery", colorVar: "cat-amber" },
  { value: "meat", label: "Meat & Seafood", colorVar: "cat-rose" },
  { value: "pantry", label: "Pantry", colorVar: "accent" },
  { value: "household", label: "Household", colorVar: "cat-slate" },
  { value: "other", label: "Other", colorVar: "cat-neutral" },
];

export function categoryLabel(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function categoryColorVar(value: string): string {
  return CATEGORIES.find((c) => c.value === value)?.colorVar ?? "cat-neutral";
}
