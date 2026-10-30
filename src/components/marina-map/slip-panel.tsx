import { MailIcon, PhoneIcon, XIcon } from "@/components/icons";
import type { MapBoat, MapSlip } from "./marina-map";
import { statusStyle } from "./statuses";

// What to say in the vessel section when a slip has no boat.
const NO_BOAT_TEXT: Record<string, string> = {
  available: "This slip is open and has no vessel assigned.",
  maintenance: "This slip is closed for maintenance.",
  occupied: "No vessel is on record for this slip.",
  reserved: "No vessel is on record for this reservation.",
};

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5 text-sm">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-right font-medium">{children}</dd>
    </div>
  );
}

function Vessel({ boat, slip }: { boat: MapBoat; slip: MapSlip }) {
  const room = boat.length !== null ? slip.length - boat.length : null;
  return (
    <div>
      <p className="text-lg font-semibold tracking-tight">{boat.name}</p>
      <p className="mt-0.5 text-sm text-muted-foreground">
        {[boat.type, boat.length !== null ? `${boat.length} ft` : null].filter(Boolean).join(" · ")}
      </p>

      <dl className="mt-4 divide-y">
        {boat.registration && <Row label="Registration">{boat.registration}</Row>}
        {room !== null && <Row label="Room to spare">{room} ft</Row>}
        <Row label="Owner">{boat.owner_name}</Row>
      </dl>

      {(boat.owner_phone || boat.owner_email) && (
        <ul className="mt-3 space-y-2 text-sm">
          {boat.owner_phone && (
            <li>
              <a
                href={`tel:${boat.owner_phone.replace(/[^\d+]/g, "")}`}
                className="inline-flex items-center gap-2.5 rounded-lg py-1 hover:text-primary"
              >
                <PhoneIcon className="size-4 text-muted-foreground" />
                {boat.owner_phone}
              </a>
            </li>
          )}
          {boat.owner_email && (
            <li>
              <a
                href={`mailto:${boat.owner_email}`}
                className="inline-flex items-center gap-2.5 break-all rounded-lg py-1 hover:text-primary"
              >
                <MailIcon className="size-4 shrink-0 text-muted-foreground" />
                {boat.owner_email}
              </a>
            </li>
          )}
        </ul>
      )}
    </div>
  );
}

export function SlipPanel({
  slip,
  dockName,
  onClose,
}: {
  slip: MapSlip;
  dockName: string;
  onClose: () => void;
}) {
  const status = statusStyle(slip.status);

  return (
    <aside
      aria-label={`Slip ${slip.name} details`}
      className="animate-panel-in fixed inset-x-3 bottom-3 z-30 max-h-[75dvh] overflow-y-auto rounded-card border bg-card p-6 shadow-soft lg:sticky lg:inset-auto lg:top-28 lg:z-auto lg:max-h-[calc(100dvh-8rem)]"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-muted-foreground">Slip</p>
          <h3 className="text-3xl font-semibold tracking-tight">{slip.name}</h3>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close slip details"
          className="-mr-2 -mt-1 grid size-10 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
        >
          <XIcon />
        </button>
      </div>

      <span className="mt-3 inline-flex items-center gap-2 rounded-full border bg-background px-3 py-1 text-sm font-medium">
        <span
          aria-hidden="true"
          className="size-2.5 rounded-full border border-foreground/10"
          style={{ backgroundColor: status.fill }}
        />
        {status.label}
      </span>

      <dl className="mt-5 divide-y">
        <Row label="Dock">{dockName}</Row>
        <Row label="Size">
          {slip.length} × {slip.width} ft
        </Row>
      </dl>

      <h4 className="mt-7 mb-3 text-sm font-semibold tracking-wide text-muted-foreground uppercase">
        {slip.status === "reserved" ? "Reserved for" : "Vessel"}
      </h4>
      {slip.boat ? (
        <Vessel boat={slip.boat} slip={slip} />
      ) : (
        <p className="rounded-2xl bg-background p-4 text-sm text-muted-foreground">
          {NO_BOAT_TEXT[slip.status] ?? "No vessel assigned."}
        </p>
      )}
    </aside>
  );
}
