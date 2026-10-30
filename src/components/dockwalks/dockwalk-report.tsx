import { statusStyle } from "@/components/marina-map/statuses";
import type { Reading, WalkEntry } from "@/lib/dockwalks";
import { formatNumber, mismatchText, usage, type Usage } from "@/lib/dockwalk-utils";
import { cn } from "@/lib/utils";

type ReportSlip = { id: string; name: string; status: string };
type ReportDock = { id: string; name: string; slips: ReportSlip[] };

// Meter cell: the reading, and how much was used since the last dockwalk.
function MeterCell({ reading, used }: { reading: number | null; used: Usage }) {
  if (reading === null) return <span className="text-muted-foreground">—</span>;
  return (
    <div>
      <span className="font-medium">{formatNumber(reading)}</span>
      {used.kind === "used" && (
        <span className="block text-xs text-muted-foreground">+{formatNumber(used.value)} used</span>
      )}
      {used.kind === "lower" && <span className="block text-xs text-amber-700">Lower than last</span>}
    </div>
  );
}

function Stat({ label, value, note }: { label: string; value: string; note?: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      {note && <p className="mt-0.5 text-xs text-muted-foreground">{note}</p>}
    </div>
  );
}

// The read-only result of a finished dockwalk.
export function DockwalkReport({
  docks,
  entries,
  previous,
}: {
  docks: ReportDock[];
  entries: Map<string, WalkEntry>;
  previous: Map<string, Reading>;
}) {
  const slips = docks.flatMap((dock) => dock.slips);
  let checked = 0;
  let occupied = 0;
  let mismatches = 0;
  let electricUsed = 0;
  let waterUsed = 0;

  const usageOf = (slipId: string) => {
    const entry = entries.get(slipId);
    const before = previous.get(slipId);
    return {
      electric: usage(entry?.electric_kwh ?? null, before?.electric_kwh ?? null),
      water: usage(entry?.water_gal ?? null, before?.water_gal ?? null),
    };
  };

  for (const slip of slips) {
    const entry = entries.get(slip.id);
    if (entry?.occupied !== null && entry?.occupied !== undefined) {
      checked += 1;
      if (entry.occupied) occupied += 1;
      if (mismatchText(entry.occupied, entry.system_status)) mismatches += 1;
    }
    const used = usageOf(slip.id);
    if (used.electric.kind === "used") electricUsed += used.electric.value;
    if (used.water.kind === "used") waterUsed += used.water.value;
  }

  return (
    <div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Slips checked" value={`${checked} of ${slips.length}`} />
        <Stat label="Found occupied" value={String(occupied)} />
        <Stat
          label="Differ from system"
          value={String(mismatches)}
          note={mismatches > 0 ? "Marked in amber below" : undefined}
        />
        <Stat label="Electric used" value={`${formatNumber(electricUsed)} kWh`} note="Since the last readings" />
        <Stat label="Water used" value={`${formatNumber(waterUsed)} gal`} note="Since the last readings" />
      </div>

      {docks.map((dock) => (
        <section key={dock.id} className="mt-8">
          <h3 className="mb-3 text-lg font-semibold tracking-tight">Dock {dock.name}</h3>
          <div className="overflow-x-auto rounded-card border bg-card">
            <table className="w-full min-w-[34rem] text-left text-sm">
              <thead className="border-b text-xs font-medium text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Slip</th>
                  <th scope="col" className="px-4 py-3 font-medium">Found</th>
                  <th scope="col" className="px-4 py-3 font-medium">Electric (kWh)</th>
                  <th scope="col" className="px-4 py-3 font-medium">Water (gal)</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {dock.slips.map((slip) => {
                  const entry = entries.get(slip.id);
                  const used = usageOf(slip.id);
                  const found = entry?.occupied ?? null;
                  const differs = entry ? mismatchText(found, entry.system_status) : null;
                  const system = statusStyle(entry?.system_status ?? slip.status);
                  return (
                    <tr key={slip.id} className={cn(differs && "bg-amber-50")}>
                      <th scope="row" className="px-4 py-3 align-top font-semibold">
                        {slip.name}
                      </th>
                      <td className="px-4 py-3 align-top">
                        {found === null ? (
                          <span className="text-muted-foreground">Not recorded</span>
                        ) : (
                          <div>
                            <span className="font-medium">{found ? "Occupied" : "Empty"}</span>
                            <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              <span
                                aria-hidden="true"
                                className="size-2 rounded-full border border-foreground/10"
                                style={{ backgroundColor: system.fill }}
                              />
                              System: {system.label}
                            </span>
                            {differs && <span className="block text-xs font-medium text-amber-700">Differs from system</span>}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 align-top">
                        <MeterCell reading={entry?.electric_kwh ?? null} used={used.electric} />
                      </td>
                      <td className="px-4 py-3 align-top">
                        <MeterCell reading={entry?.water_gal ?? null} used={used.water} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
