export interface NoteColorMeta {
  value: string;
  colorVar: string;
}

export const NOTE_COLORS: NoteColorMeta[] = [
  { value: "amber", colorVar: "cat-amber" },
  { value: "blue", colorVar: "cat-blue" },
  { value: "rose", colorVar: "cat-rose" },
  { value: "sage", colorVar: "sage" },
  { value: "slate", colorVar: "cat-slate" },
  { value: "accent", colorVar: "accent" },
];

export function noteColorVar(value: string): string {
  return NOTE_COLORS.find((c) => c.value === value)?.colorVar ?? "cat-amber";
}
