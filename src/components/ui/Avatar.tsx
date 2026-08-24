function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function Avatar({
  name,
  photoUrl,
  className = "",
}: {
  name: string;
  photoUrl?: string | null;
  className?: string;
}) {
  if (photoUrl) {
    // eslint-disable-next-line @next/next/no-img-element -- data: URIs aren't valid src values for next/image
    return <img src={photoUrl} alt="" className={`rounded-full object-cover ${className}`} />;
  }

  return (
    <div
      className={`flex items-center justify-center rounded-full bg-accent-soft text-sm font-semibold text-accent ${className}`}
      aria-hidden
    >
      {initials(name)}
    </div>
  );
}
