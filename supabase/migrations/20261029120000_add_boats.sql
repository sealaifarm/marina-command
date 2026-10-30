-- Marina Command: boats
-- A boat is a vessel kept at a marina, optionally assigned to one slip.
--   occupied slip  -> the boat currently in it
--   reserved slip  -> the boat the slip is reserved for
-- A slip holds at most one boat. Deleting a slip leaves the boat unassigned.
-- Boat length is in feet.

create table public.boats (
  id           uuid primary key default gen_random_uuid(),
  marina_id    uuid not null references public.marinas (id) on delete cascade,
  slip_id      uuid unique references public.slips (id) on delete set null,
  name         text not null,
  type         text,
  length       numeric check (length > 0),
  registration text,
  owner_name   text not null,
  owner_phone  text,
  owner_email  text,
  created_at   timestamptz not null default now()
);

create index boats_marina_id_idx on public.boats (marina_id);

alter table public.boats enable row level security;

grant select, insert, update, delete on public.boats to authenticated;

create policy "Members can view boats"
  on public.boats for select to authenticated
  using (public.marina_role(marina_id) is not null);

create policy "Owners and managers can edit boats"
  on public.boats for all to authenticated
  using (public.marina_role(marina_id) in ('owner', 'manager'))
  with check (public.marina_role(marina_id) in ('owner', 'manager'));

-- Staff can update boats (e.g. change an assignment or contact details)
create policy "Staff can update boats"
  on public.boats for update to authenticated
  using (public.marina_role(marina_id) = 'staff')
  with check (public.marina_role(marina_id) = 'staff');
