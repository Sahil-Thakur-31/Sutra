export interface BillCategoryMeta {
  value: string;
  label: string;
  colorVar: string;
}

export const BILL_CATEGORIES: BillCategoryMeta[] = [
  { value: "groceries", label: "Groceries", colorVar: "sage" },
  { value: "utilities", label: "Utilities", colorVar: "cat-blue" },
  { value: "rent", label: "Rent", colorVar: "cat-amber" },
  { value: "entertainment", label: "Entertainment", colorVar: "cat-rose" },
  { value: "other", label: "Other", colorVar: "cat-neutral" },
];

export function billCategoryLabel(value: string | null): string {
  return BILL_CATEGORIES.find((c) => c.value === value)?.label ?? "Other";
}

export function billCategoryColorVar(value: string | null): string {
  return BILL_CATEGORIES.find((c) => c.value === value)?.colorVar ?? "cat-neutral";
}
