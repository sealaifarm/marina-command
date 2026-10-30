-- Marina Command: dockwalks
-- A dockwalk is one walk of a marina's docks. For each slip the walker records
--   - whether a boat is actually there (occupied or empty), and
--   - the pedestal meter readings (electric in kWh, water in gallons).
-- Meter readings are the number shown on the meter, not usage: usage is the
-- difference from the previous dockwalk's reading, worked out by the app.

create table public.dockwalks (
  id            uuid primary key default gen_random_uuid(),
  marina_id     uuid not null references public.marinas (id) on delete cascade,
  started_at    timestamptz not null default now(),
  completed_at  timestamptz,             -- null while the walk is in progress
  walker_email  text,
  created_at    timestamptz not null default now(),
  -- lets entries prove they belong to the same marina as their dockwalk
  unique (id, marina_id)
);

create index dockwalks_marina_started_idx on public.dockwalks (marina_id, started_at desc);

-- At most one dockwalk in progress per marina, so two people don't start
-- competing walks. (Everyone can still record entries on the open one.)
create unique index dockwalks_one_open_per_marina
  on public.dockwalks (marina_id)
  where completed_at is null;

create table public.dockwalk_entries (
  id            uuid primary key default gen_random_uuid(),
  dockwalk_id   uuid not null,
  marina_id     uuid not null,
  slip_id       uuid not null references public.slips (id) on delete cascade,
  occupied      boolean,                 -- what the walker found; null = not recorded
  electric_kwh  numeric check (electric_kwh >= 0),
  water_gal     numeric check (water_gal >= 0),
  -- the slip's status in the system when it was recorded, so the walk keeps
  -- making sense after the slip's status changes later
  system_status text,
  -- true when what the walker found disagrees with the system
  -- (the system counts only 'occupied' as occupied)
  mismatch      boolean generated always as (
                  case
                    when occupied is null or system_status is null then false
                    else occupied <> (system_status = 'occupied')
                  end
                ) stored,
  updated_at    timestamptz not null default now(),
  unique (dockwalk_id, slip_id),
  foreign key (dockwalk_id, marina_id)
    references public.dockwalks (id, marina_id) on delete cascade
);

create index dockwalk_entries_marina_id_idx on public.dockwalk_entries (marina_id);
create index dockwalk_entries_slip_id_idx on public.dockwalk_entries (slip_id);

-- One row per dockwalk with its totals, for the history list.
-- security_invoker makes it follow the same row level security as the tables.
create view public.dockwalk_summaries with (security_invoker = true) as
select
  d.id,
  d.marina_id,
  d.started_at,
  d.completed_at,
  d.walker_email,
  count(e.id) filter (where e.occupied is not null) as slips_checked,
  count(e.id) filter (where e.occupied)             as occupied_found,
  count(e.id) filter (where e.mismatch)             as mismatches
from public.dockwalks d
left join public.dockwalk_entries e on e.dockwalk_id = d.id
group by d.id;

-- ---------------------------------------------------------------
-- Access: every member of the organization can do and record dockwalks
-- (staff do the walking). Only owners and managers can delete finished ones.
-- ---------------------------------------------------------------

alter table public.dockwalks        enable row level security;
alter table public.dockwalk_entries enable row level security;

grant select, insert, update, delete on public.dockwalks, public.dockwalk_entries to authenticated;
grant select on public.dockwalk_summaries to authenticated;

create policy "Members can view dockwalks"
  on public.dockwalks for select to authenticated
  using (public.marina_role(marina_id) is not null);

create policy "Members can start dockwalks"
  on public.dockwalks for insert to authenticated
  with check (public.marina_role(marina_id) is not null);

create policy "Members can update dockwalks"
  on public.dockwalks for update to authenticated
  using (public.marina_role(marina_id) is not null)
  with check (public.marina_role(marina_id) is not null);

-- Anyone can discard a walk that is still in progress (e.g. started by mistake)
create policy "Members can discard open dockwalks, managers can delete any"
  on public.dockwalks for delete to authenticated
  using (
    public.marina_role(marina_id) in ('owner', 'manager')
    or (public.marina_role(marina_id) is not null and completed_at is null)
  );

create policy "Members can view dockwalk entries"
  on public.dockwalk_entries for select to authenticated
  using (public.marina_role(marina_id) is not null);

create policy "Members can record dockwalk entries"
  on public.dockwalk_entries for insert to authenticated
  with check (public.marina_role(marina_id) is not null);

create policy "Members can update dockwalk entries"
  on public.dockwalk_entries for update to authenticated
  using (public.marina_role(marina_id) is not null)
  with check (public.marina_role(marina_id) is not null);

create policy "Members can delete dockwalk entries"
  on public.dockwalk_entries for delete to authenticated
  using (public.marina_role(marina_id) is not null);
