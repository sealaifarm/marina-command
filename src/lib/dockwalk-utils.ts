// Small helpers shared by the Dockwalks pages and form. No React, no database.

// The system counts only an 'occupied' slip as occupied. A boat found in a
// 'reserved' slip, or a slip marked 'occupied' that is empty, is a mismatch.
// (The database computes the same thing into dockwalk_entries.mismatch.)
export function isMismatch(found: boolean | null, systemStatus: string | null) {
  if (found === null || systemStatus === null) return false;
  return found !== (systemStatus === "occupied");
}

// "Found occupied, marked reserved" / "Found empty, marked occupied", or null.
export function mismatchText(found: boolean | null, systemStatus: string | null) {
  if (!isMismatch(found, systemStatus)) return null;
  return `Found ${found ? "occupied" : "empty"}, marked ${systemStatus}`;
}

// Reading typed into a field: empty is fine (no reading), otherwise a plain
// non-negative number. Commas are allowed (12,408.5).
export function parseReading(text: string): { ok: true; value: number | null } | { ok: false } {
  const cleaned = text.trim().replace(/,/g, "");
  if (cleaned === "") return { ok: true, value: null };
  if (!/^\d+(\.\d+)?$/.test(cleaned)) return { ok: false };
  return { ok: true, value: Number(cleaned) };
}

// Usage since the previous reading. 'lower' means the meter went backwards,
// which is usually a typo or a replaced meter, so it is flagged, not counted.
export type Usage =
  | { kind: "none" } // no reading now, or nothing to compare with
  | { kind: "used"; value: number }
  | { kind: "lower" };

export function usage(current: number | null, previous: number | null): Usage {
  if (current === null || previous === null) return { kind: "none" };
  if (current < previous) return { kind: "lower" };
  // round away floating point noise (12408.3 - 12400.1)
  return { kind: "used", value: Math.round((current - previous) * 100) / 100 };
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 1 }).format(value);
}
