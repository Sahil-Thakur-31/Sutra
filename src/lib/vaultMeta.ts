export interface VaultCategoryMeta {
  value: string;
  label: string;
  colorVar: string;
}

export const VAULT_CATEGORIES: VaultCategoryMeta[] = [
  { value: "contacts", label: "Contacts", colorVar: "cat-blue" },
  { value: "wifi", label: "Wi-Fi", colorVar: "sage" },
  { value: "documents", label: "Documents", colorVar: "cat-amber" },
  { value: "medical", label: "Medical", colorVar: "cat-rose" },
  { value: "other", label: "Other", colorVar: "cat-neutral" },
];

export function vaultCategoryLabel(value: string): string {
  return VAULT_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

export function vaultCategoryColorVar(value: string): string {
  return VAULT_CATEGORIES.find((c) => c.value === value)?.colorVar ?? "cat-neutral";
}
