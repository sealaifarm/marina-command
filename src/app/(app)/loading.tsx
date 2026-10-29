// Shown inside the app shell while a page loads.
//
// Besides the instant feedback, this file is what lets Next.js prefetch these
// routes: without a loading boundary, pages under a layout that reads cookies
// are not prefetched, so every sidebar click waited on the server before
// anything changed on screen.
export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="max-w-2xl animate-pulse motion-reduce:animate-none"
    >
      <span className="sr-only">Loading…</span>
      <div className="h-9 w-64 max-w-full rounded-xl bg-muted" />
      <div className="mt-5 h-4 w-96 max-w-full rounded-lg bg-muted" />
      <div className="mt-3 h-4 w-72 max-w-full rounded-lg bg-muted" />
    </div>
  );
}
