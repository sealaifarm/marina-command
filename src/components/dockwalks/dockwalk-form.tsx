"use client";

import { useEffect, useId, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  discardDockwalk,
  saveDockwalk,
  type SaveEntry,
} from "@/app/(app)/spaces/dockwalks/actions";
import { SpinnerIcon } from "@/components/icons";
import { statusStyle } from "@/components/marina-map/statuses";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatNumber, mismatchText, parseReading } from "@/lib/dockwalk-utils";
import { cn } from "@/lib/utils";

export type FormSlip = {
  id: string;
  name: string;
  length: number;
  width: number;
  status: string; // the slip's status in the system
  boatName: string | null;
};
export type FormDock = { id: string; name: string; slips: FormSlip[] };
// What is on screen for one slip. Readings stay as text while typing.
export type FormRow = { occupied: boolean | null; electric: string; water: string };
export type LastReading = { electric_kwh: number | null; water_gal: number | null };

const EMPTY_ROW: FormRow = { occupied: null, electric: "", water: "" };
const NO_READING: LastReading = { electric_kwh: null, water_gal: null };

function ReadingField({
  label,
  value,
  last,
  onChange,
}: {
  label: string;
  value: string;
  last: number | null;
  onChange: (value: string) => void;
}) {
  const id = useId();
  const parsed = parseReading(value);
  const lower = parsed.ok && parsed.value !== null && last !== null && parsed.value < last;

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      <Input
        id={id}
        inputMode="decimal"
        autoComplete="off"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        aria-invalid={!parsed.ok}
        placeholder={last !== null ? formatNumber(last) : "Reading"}
        className="h-11"
      />
      <p
        className={cn(
          "mt-1.5 text-xs",
          !parsed.ok ? "text-destructive" : lower ? "text-amber-700" : "text-muted-foreground"
        )}
      >
        {!parsed.ok
          ? "Enter a number"
          : lower
            ? "Lower than last reading"
            : last !== null
              ? `Last: ${formatNumber(last)}`
              : "No earlier reading"}
      </p>
    </div>
  );
}

function SlipRow({
  slip,
  row,
  last,
  onChange,
}: {
  slip: FormSlip;
  row: FormRow;
  last: LastReading;
  onChange: (patch: Partial<FormRow>) => void;
}) {
  const system = statusStyle(slip.status);
  const differs = mismatchText(row.occupied, slip.status);

  return (
    <li className="grid gap-4 rounded-2xl border bg-card p-4 md:grid-cols-[13rem_12rem_1fr_1fr] md:items-start">
      <div className="min-w-0">
        <p className="text-lg font-semibold tracking-tight">{slip.name}</p>
        <p className="text-xs text-muted-foreground">
          {slip.length} × {slip.width} ft
        </p>
        <p className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <span
            aria-hidden="true"
            className="size-2.5 shrink-0 rounded-full border border-foreground/10"
            style={{ backgroundColor: system.fill }}
          />
          <span className="min-w-0 truncate">
            In system: {system.label}
            {slip.boatName ? ` · ${slip.boatName}` : ""}
          </span>
        </p>
      </div>

      <div>
        <p className="mb-1.5 text-xs font-medium text-muted-foreground">Found</p>
        <div role="group" aria-label={`Is slip ${slip.name} occupied?`} className="flex gap-2">
          {[
            { label: "Occupied", value: true },
            { label: "Empty", value: false },
          ].map((option) => {
            const selected = row.occupied === option.value;
            return (
              <button
                key={option.label}
                type="button"
                aria-pressed={selected}
                // tapping the chosen option again clears it
                onClick={() => onChange({ occupied: selected ? null : option.value })}
                className={cn(
                  "h-11 flex-1 rounded-full border text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input bg-card text-foreground hover:bg-muted"
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
        <p className={cn("mt-1.5 text-xs", differs ? "text-amber-700" : "text-transparent select-none")}>
          {differs ?? "·"}
        </p>
      </div>

      <ReadingField
        label="Electric (kWh)"
        value={row.electric}
        last={last.electric_kwh}
        onChange={(electric) => onChange({ electric })}
      />
      <ReadingField
        label="Water (gal)"
        value={row.water}
        last={last.water_gal}
        onChange={(water) => onChange({ water })}
      />
    </li>
  );
}

export function DockwalkForm({
  walkId,
  docks,
  initial,
  previous,
}: {
  walkId: string;
  docks: FormDock[];
  initial: Record<string, FormRow>;
  previous: Record<string, LastReading>;
}) {
  const router = useRouter();
  const [rows, setRows] = useState<Record<string, FormRow>>(initial);
  const [dirty, setDirty] = useState<Set<string>>(new Set()); // slips changed since the last save
  const [activeDockId, setActiveDockId] = useState(docks[0]?.id ?? "");
  const [notice, setNotice] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  const allSlips = docks.flatMap((dock) => dock.slips);
  const total = allSlips.length;
  const rowOf = (id: string) => rows[id] ?? EMPTY_ROW;
  const isRecorded = (id: string) => rowOf(id).occupied !== null;
  const recorded = allSlips.filter((slip) => isRecorded(slip.id)).length;
  const hasInvalid = allSlips.some((slip) => {
    const row = rowOf(slip.id);
    return !parseReading(row.electric).ok || !parseReading(row.water).ok;
  });
  const activeDock = docks.find((dock) => dock.id === activeDockId) ?? docks[0];

  // Warn before leaving the page with unsaved changes.
  useEffect(() => {
    if (dirty.size === 0) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  function change(slipId: string, patch: Partial<FormRow>) {
    setRows((current) => ({ ...current, [slipId]: { ...(current[slipId] ?? EMPTY_ROW), ...patch } }));
    setDirty((current) => new Set(current).add(slipId));
    setNotice(null);
    setConfirming(false);
  }

  function save(finish: boolean) {
    const entries: SaveEntry[] = [];
    for (const slipId of dirty) {
      const row = rowOf(slipId);
      const electric = parseReading(row.electric);
      const water = parseReading(row.water);
      if (!electric.ok || !water.ok) return;
      entries.push({
        slip_id: slipId,
        occupied: row.occupied,
        electric_kwh: electric.value,
        water_gal: water.value,
      });
    }

    setNotice(null);
    setConfirming(false);
    startTransition(async () => {
      const result = await saveDockwalk(walkId, entries, finish);
      if (!result.ok) {
        setNotice({ kind: "error", text: result.error });
        return;
      }
      setDirty(new Set());
      if (finish) router.refresh(); // the page now shows the finished report
      else setNotice({ kind: "ok", text: "Progress saved." });
    });
  }

  function finish() {
    if (recorded < total && !confirming) {
      setConfirming(true);
      return;
    }
    save(true);
  }

  if (docks.length === 0) {
    return <p className="text-muted-foreground">This marina has no slips to walk yet.</p>;
  }

  return (
    <div>
      {/* Progress */}
      <div>
        <p className="text-sm">
          <span className="font-semibold">{recorded}</span>
          <span className="text-muted-foreground"> of {total} slips recorded</span>
        </p>
        <div
          role="progressbar"
          aria-label="Slips recorded"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={recorded}
          className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        >
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-300 motion-reduce:transition-none"
            style={{ width: `${total ? (recorded / total) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* One dock at a time keeps the list short */}
      <div className="mt-6 flex flex-wrap gap-2">
        {docks.map((dock) => {
          const done = dock.slips.filter((slip) => isRecorded(slip.id)).length;
          const active = dock.id === activeDock.id;
          return (
            <button
              key={dock.id}
              type="button"
              aria-pressed={active}
              onClick={() => setActiveDockId(dock.id)}
              className={cn(
                "h-11 rounded-2xl border px-4 text-sm transition-colors focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-ring/25",
                active
                  ? "border-transparent bg-primary/10 font-semibold text-foreground"
                  : "border-input bg-card font-medium text-foreground/80 hover:bg-muted"
              )}
            >
              Dock {dock.name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {done}/{dock.slips.length}
              </span>
            </button>
          );
        })}
      </div>

      <ul className="mt-4 space-y-3">
        {activeDock.slips.map((slip) => (
          <SlipRow
            key={slip.id}
            slip={slip}
            row={rowOf(slip.id)}
            last={previous[slip.id] ?? NO_READING}
            onChange={(patch) => change(slip.id, patch)}
          />
        ))}
      </ul>

      {/* Actions stay in reach while scrolling */}
      <div className="sticky bottom-4 z-10 mt-6 rounded-card border bg-card p-3 shadow-soft">
        {(notice || hasInvalid || confirming) && (
          <p
            role={notice?.kind === "error" ? "alert" : "status"}
            className={cn(
              "px-2 pb-3 text-sm",
              notice?.kind === "error" || hasInvalid ? "text-destructive" : "text-muted-foreground"
            )}
          >
            {hasInvalid
              ? "Fix the highlighted readings to save."
              : confirming
                ? `${total - recorded} ${total - recorded === 1 ? "slip hasn't" : "slips haven't"} been marked occupied or empty. Finish anyway?`
                : notice?.text}
          </p>
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {confirming ? (
            <>
              <Button variant="ghost" onClick={() => setConfirming(false)} disabled={pending}>
                Keep walking
              </Button>
              <Button onClick={() => save(true)} disabled={pending || hasInvalid}>
                {pending && <SpinnerIcon className="size-4" />}
                Finish anyway
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={() => save(false)}
                disabled={pending || hasInvalid || dirty.size === 0}
              >
                {pending && <SpinnerIcon className="size-4" />}
                Save progress
              </Button>
              <Button onClick={finish} disabled={pending || hasInvalid}>
                Finish dockwalk
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// Throws away a dockwalk that is still in progress.
export function DiscardButton({ walkId }: { walkId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (window.confirm("Discard this dockwalk? Everything recorded on it will be lost.")) {
          startTransition(() => discardDockwalk(walkId));
        }
      }}
    >
      Discard
    </Button>
  );
}
