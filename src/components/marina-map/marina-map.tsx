"use client";

import { useEffect, useState } from "react";
import { SlipPanel } from "./slip-panel";
import { STATUSES, statusStyle } from "./statuses";

// Draws a marina from database rows and lets you click a slip to see its details.
// No data fetching here: the page loads the rows and passes them in.
//
// Everything on screen comes from the rows it is given:
//   - canvas size   -> map_layouts (width x height, in feet)
//   - docks         -> docks (map_x, map_y, length, width, rotation)
//   - slips         -> slips (same position fields, plus status)
// A different marina simply has different rows, so it draws a different layout.
// Nothing here is specific to Golden Tide.

export type MapLayout = { width: number; height: number };

export type MapDock = {
  id: string;
  name: string;
  length: number;
  width: number;
  map_x: number;
  map_y: number;
  rotation: number;
};

export type MapBoat = {
  name: string;
  type: string | null;
  length: number | null;
  registration: string | null;
  owner_name: string;
  owner_phone: string | null;
  owner_email: string | null;
};

export type MapSlip = {
  id: string;
  dock_id: string;
  name: string;
  length: number;
  width: number;
  status: string;
  map_x: number;
  map_y: number;
  rotation: number;
  boat: MapBoat | null;
};

const PADDING = 12; // feet of breathing room when we have to work out the canvas ourselves

// Half-extents of a rotated rectangle, so we can find the edges of the drawing.
function halfExtents(length: number, width: number, rotation: number) {
  const r = (rotation * Math.PI) / 180;
  const cos = Math.abs(Math.cos(r));
  const sin = Math.abs(Math.sin(r));
  return {
    hx: (cos * length) / 2 + (sin * width) / 2,
    hy: (sin * length) / 2 + (cos * width) / 2,
  };
}

// The visible area: the marina's saved canvas if it has one, otherwise a box
// around everything that was drawn.
function getViewBox(layout: MapLayout | null, docks: MapDock[], slips: MapSlip[]) {
  if (layout) return { x: 0, y: 0, w: layout.width, h: layout.height };

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  const grow = (x: number, y: number, hx: number, hy: number) => {
    minX = Math.min(minX, x - hx);
    maxX = Math.max(maxX, x + hx);
    minY = Math.min(minY, y - hy);
    maxY = Math.max(maxY, y + hy);
  };
  for (const s of [...docks, ...slips]) {
    const { hx, hy } = halfExtents(s.length, s.width, s.rotation);
    grow(s.map_x, s.map_y, hx, hy);
  }
  // the dock name badges sit outside the docks, so they count too
  for (const dock of docks) {
    const badge = badgeSize(dock);
    const pos = badgePosition(dock, badge);
    grow(pos.x, pos.y, badge.width / 2, badge.height / 2);
  }
  return {
    x: minX - PADDING,
    y: minY - PADDING,
    w: maxX - minX + PADDING * 2,
    h: maxY - minY + PADDING * 2,
  };
}

// The "T head": a crossbar across the shore end of a dock, a little wider than
// the slips on either side of it. It is worked out from the dock's own slips, so
// it fits whatever layout the marina has. Measured in the dock's own frame:
// "along" runs down the dock from its start, "across" runs side to side.
function getTHead(dock: MapDock, dockSlips: MapSlip[]) {
  if (dockSlips.length === 0) return null;

  const r = (dock.rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);

  let nearestSlip = Infinity; // where the first slip begins along the dock
  let minAcross = -dock.width / 2;
  let maxAcross = dock.width / 2;
  for (const slip of dockSlips) {
    const dx = slip.map_x - dock.map_x;
    const dy = slip.map_y - dock.map_y;
    const along = dx * cos + dy * sin;
    const across = -dx * sin + dy * cos;
    const rel = ((slip.rotation - dock.rotation) * Math.PI) / 180;
    const halfAlong = (Math.abs(Math.cos(rel)) * slip.length + Math.abs(Math.sin(rel)) * slip.width) / 2;
    const halfAcross = (Math.abs(Math.sin(rel)) * slip.length + Math.abs(Math.cos(rel)) * slip.width) / 2;
    nearestSlip = Math.min(nearestSlip, along - halfAlong);
    minAcross = Math.min(minAcross, across - halfAcross);
    maxAcross = Math.max(maxAcross, across + halfAcross);
  }

  const thickness = Math.max(dock.width * 0.7, 3);
  const start = -dock.length / 2;
  // flush with the dock's start, but never touching the first slip
  const center = Math.min(start + thickness / 2, nearestSlip - 3 - thickness / 2);
  const overhang = 2.5;
  return {
    x: center - thickness / 2,
    y: minAcross - overhang,
    width: thickness,
    height: maxAcross - minAcross + overhang * 2,
  };
}

// Badge size for a dock's name: a rounded label that grows with the name.
function badgeSize(dock: MapDock) {
  const height = Math.max(dock.width * 1.3, 8);
  const width = Math.max(height, dock.name.length * height * 0.32 + height * 0.8);
  return { width, height };
}

// Where to put a dock's name badge: just past the dock's starting end
// (the end nearest the shore), in line with the dock and clear of it.
function badgePosition(dock: MapDock, badge: { width: number; height: number }) {
  const r = (dock.rotation * Math.PI) / 180;
  const cos = Math.cos(r);
  const sin = Math.sin(r);
  const badgeReach = (Math.abs(cos) * badge.width) / 2 + (Math.abs(sin) * badge.height) / 2;
  const reach = dock.length / 2 + 2 + badgeReach;
  return { x: dock.map_x - cos * reach, y: dock.map_y - sin * reach };
}

export function MarinaMap({
  marinaName,
  layout,
  docks,
  slips,
}: {
  marinaName: string;
  layout: MapLayout | null;
  docks: MapDock[];
  slips: MapSlip[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  // Escape closes the details panel
  useEffect(() => {
    if (!selectedId) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelectedId(null);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [selectedId]);

  // If the marina is switched (or the slip is deleted) the selection simply disappears.
  const selectedSlip = slips.find((slip) => slip.id === selectedId) ?? null;
  const selectedDock = selectedSlip ? docks.find((dock) => dock.id === selectedSlip.dock_id) : null;

  const counts = new Map<string, number>();
  for (const slip of slips) counts.set(slip.status, (counts.get(slip.status) ?? 0) + 1);

  const slipsByDock = new Map<string, MapSlip[]>();
  for (const slip of slips) {
    const list = slipsByDock.get(slip.dock_id);
    if (list) list.push(slip);
    else slipsByDock.set(slip.dock_id, [slip]);
  }

  const isEmpty = docks.length === 0 && slips.length === 0;
  const view = isEmpty ? null : getViewBox(layout, docks, slips);

  return (
    <div
      className={
        selectedSlip ? "lg:grid lg:grid-cols-[minmax(0,1fr)_21rem] lg:items-start lg:gap-6" : undefined
      }
    >
      <div className="min-w-0">
      {/* Legend: also the status totals */}
      <ul className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
        {STATUSES.map((s) => (
          <li key={s.key} className="flex items-center gap-2">
            <span
              aria-hidden="true"
              className="size-3.5 rounded-md border border-foreground/10"
              style={{ backgroundColor: s.fill }}
            />
            <span className="font-medium">{s.label}</span>
            <span className="text-muted-foreground">{counts.get(s.key) ?? 0}</span>
          </li>
        ))}
      </ul>

      <div className="mt-5 overflow-x-auto rounded-card border bg-card p-3 shadow-soft md:p-5">
        {view ? (
          <svg
            role="group"
            aria-label={`Map of ${marinaName}: ${docks.length} docks, ${slips.length} slips`}
            onClick={() => setSelectedId(null)}
            viewBox={`${view.x} ${view.y} ${view.w} ${view.h}`}
            className="mx-auto block h-auto rounded-2xl bg-[#e4f2fb]"
            style={{
              width: "100%",
              maxWidth: view.w * 3,
              minWidth: Math.min(view.w * 3, 520),
            }}
          >
            {docks.map((dock) => {
              const head = getTHead(dock, slipsByDock.get(dock.id) ?? []);
              return (
                <g
                  key={dock.id}
                  fill="#8f8f98"
                  transform={`translate(${dock.map_x} ${dock.map_y}) rotate(${dock.rotation})`}
                >
                  <rect
                    x={-dock.length / 2}
                    y={-dock.width / 2}
                    width={dock.length}
                    height={dock.width}
                    rx={Math.min(dock.width, dock.length) * 0.2}
                  />
                  {head && <rect {...head} rx={head.width * 0.3} />}
                </g>
              );
            })}

            {slips.map((slip) => {
              const style = statusStyle(slip.status);
              const small = Math.min(slip.length, slip.width);
              return (
                <g
                  key={slip.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`Slip ${slip.name}, ${style.label}`}
                  aria-pressed={slip.id === selectedId}
                  className="group cursor-pointer outline-none transition-opacity hover:opacity-80"
                  transform={`rotate(${slip.rotation} ${slip.map_x} ${slip.map_y})`}
                  onClick={(event) => {
                    event.stopPropagation();
                    setSelectedId(slip.id);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      setSelectedId(slip.id);
                    }
                  }}
                >
                  <title>{`${slip.name} · ${slip.length} × ${slip.width} ft · ${style.label}`}</title>
                  <rect
                    x={slip.map_x - slip.length / 2 + 0.5}
                    y={slip.map_y - slip.width / 2 + 0.5}
                    width={Math.max(slip.length - 1, 0.1)}
                    height={Math.max(slip.width - 1, 0.1)}
                    rx={small * 0.18}
                    fill={style.fill}
                    stroke="#2a2a2f"
                    strokeOpacity={0.12}
                    strokeWidth={0.3}
                    className="group-focus-visible:[stroke-opacity:1] group-focus-visible:[stroke-width:1.2px] group-focus-visible:[stroke:#2a2a2f]"
                  />
                  <text
                    x={slip.map_x}
                    y={slip.map_y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={Math.max(small * 0.48, 2)}
                    fontWeight={600}
                    fill={style.text}
                    style={{ pointerEvents: "none" }}
                  >
                    {slip.name}
                  </text>
                </g>
              );
            })}

            {/* Selected slip: a charcoal outline drawn over everything else */}
            {selectedSlip && (
              <rect
                data-testid="selected-slip-outline"
                x={selectedSlip.map_x - selectedSlip.length / 2}
                y={selectedSlip.map_y - selectedSlip.width / 2}
                width={selectedSlip.length}
                height={selectedSlip.width}
                rx={Math.min(selectedSlip.length, selectedSlip.width) * 0.2}
                fill="none"
                stroke="#2a2a2f"
                strokeWidth={1.3}
                transform={`rotate(${selectedSlip.rotation} ${selectedSlip.map_x} ${selectedSlip.map_y})`}
                style={{ pointerEvents: "none" }}
              />
            )}

            {docks.map((dock) => {
              const badge = badgeSize(dock);
              const pos = badgePosition(dock, badge);
              const size = badge.height;
              const badgeWidth = badge.width;
              return (
                <g key={dock.id}>
                  <rect
                    x={pos.x - badgeWidth / 2}
                    y={pos.y - size / 2}
                    width={badgeWidth}
                    height={size}
                    rx={size * 0.28}
                    fill="#2a2a2f"
                  />
                  <text
                    x={pos.x}
                    y={pos.y}
                    textAnchor="middle"
                    dominantBaseline="central"
                    fontSize={size * 0.55}
                    fontWeight={700}
                    fill="#ffffff"
                  >
                    {dock.name}
                  </text>
                </g>
              );
            })}
          </svg>
        ) : (
          <p className="px-2 py-10 text-center text-sm text-muted-foreground">
            No docks or slips have been added to this marina yet.
          </p>
        )}
      </div>
      </div>

      {selectedSlip && (
        <SlipPanel
          slip={selectedSlip}
          dockName={selectedDock?.name ?? ""}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  );
}
