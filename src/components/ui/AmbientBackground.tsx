export function AmbientBackground() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-bg">
      <div className="animate-float-blob absolute -top-32 -left-24 size-96 rounded-full bg-accent/20 blur-3xl" />
      <div
        className="animate-float-blob absolute top-1/3 -right-32 size-[28rem] rounded-full bg-sage/20 blur-3xl"
        style={{ animationDelay: "-8s" }}
      />
      <div
        className="animate-float-blob absolute -bottom-40 left-1/4 size-80 rounded-full bg-accent/10 blur-3xl"
        style={{ animationDelay: "-14s" }}
      />
    </div>
  );
}
