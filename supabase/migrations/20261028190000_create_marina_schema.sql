-- Marina Command: initial schema
-- Covers organizations, marinas, access, and the Spaces -> Marina Map data.
-- All physical dimensions and map coordinates are in feet.

-- ---------------------------------------------------------------
-- Organizations and access
-- ---------------------------------------------------------------

create table public.organizations (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz not null default now()
);

-- Who can access an organization (and therefore all of its marinas).
--   owner    - full control, including members
--   manager  - edits marinas, docks, slips and the map
--   staff    - views everything and updates slip status
create table public.organization_members (
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  user_id          uuid not null references auth.users (id) on delete cascade,
  role             text not null check (role in ('owner', 'manager', 'staff')),
  created_at       timestamptz not null default now(),
  primary key (organization_id, user_id)
);

create index organization_members_user_id_idx on public.organization_members (user_id);

-- ---------------------------------------------------------------
-- Marinas
-- ---------------------------------------------------------------

create table public.marinas (
  id               uuid primary key default gen_random_uuid(),
  organization_id  uuid not null references public.organizations (id) on delete cascade,
  name             text not null,
  address          text,
  city             text,
  state            text,
  created_at       timestamptz not null default now()
);

create index marinas_organization_id_idx on public.marinas (organization_id);

-- ---------------------------------------------------------------
-- Marina map
-- ---------------------------------------------------------------

-- The map canvas for a marina. One per marina for now.
-- width and height are the size of the canvas in feet.
create table public.map_layouts (
  id          uuid primary key default gen_random_uuid(),
  marina_id   uuid not null unique references public.marinas (id) on delete cascade,
  width       numeric not null check (width > 0),
  height      numeric not null check (height > 0),
  created_at  timestamptz not null default now()
);

-- Map position convention for docks and slips:
--   map_x, map_y = center of the shape, in feet from the top-left of the canvas
--   length       = long side, drawn along the x axis when rotation is 0
--   width        = short side, drawn along the y axis when rotation is 0
--   rotation     = degrees clockwise around the center
create table public.docks (
  id          uuid primary key default gen_random_uuid(),
  marina_id   uuid not null references public.marinas (id) on delete cascade,
  name        text not null,
  length      numeric not null check (length > 0),
  width       numeric not null check (width > 0),
  map_x       numeric not null default 0,
  map_y       numeric not null default 0,
  rotation    numeric not null default 0,
  created_at  timestamptz not null default now(),
  unique (marina_id, name),
  -- lets slips prove their dock belongs to the same marina
  unique (id, marina_id)
);

create index docks_marina_id_idx on public.docks (marina_id);

-- Slip length and width are the physical size of the berth, in feet.
create table public.slips (
  id          uuid primary key default gen_random_uuid(),
  marina_id   uuid not null references public.marinas (id) on delete cascade,
  dock_id     uuid not null,
  name        text not null,
  length      numeric not null check (length > 0),
  width       numeric not null check (width > 0),
  status      text not null default 'available'
              check (status in ('available', 'occupied', 'reserved', 'maintenance')),
  map_x       numeric not null default 0,
  map_y       numeric not null default 0,
  rotation    numeric not null default 0,
  created_at  timestamptz not null default now(),
  unique (marina_id, name),
  foreign key (dock_id, marina_id) references public.docks (id, marina_id) on delete cascade
);

create index slips_marina_id_idx on public.slips (marina_id);
create index slips_dock_id_idx on public.slips (dock_id);

-- ---------------------------------------------------------------
-- Turn on row level security (policies are in the next migration)
-- ---------------------------------------------------------------

alter table public.organizations        enable row level security;
alter table public.organization_members enable row level security;
alter table public.marinas              enable row level security;
alter table public.map_layouts          enable row level security;
alter table public.docks                enable row level security;
alter table public.slips                enable row level security;
