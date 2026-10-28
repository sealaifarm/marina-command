-- Marina Command: access control (row level security)
--
-- Access works through organization_members:
--   owner    - everything, including managing members
--   manager  - edit marinas, docks, slips and the map
--   staff    - view everything and update slips (e.g. status)
-- Members of an organization can see all of its marinas.

-- ---------------------------------------------------------------
-- Helper functions
-- ---------------------------------------------------------------
-- These read organization_members as the table owner so the policies
-- below don't trigger row level security on that table recursively.

create function public.org_role(p_organization_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select role
  from public.organization_members
  where organization_id = p_organization_id
    and user_id = (select auth.uid())
$$;

create function public.marina_role(p_marina_id uuid)
returns text
language sql
stable
security definer
set search_path = ''
as $$
  select m.role
  from public.marinas k
  join public.organization_members m on m.organization_id = k.organization_id
  where k.id = p_marina_id
    and m.user_id = (select auth.uid())
$$;

revoke execute on function public.org_role(uuid) from public, anon;
revoke execute on function public.marina_role(uuid) from public, anon;
grant execute on function public.org_role(uuid) to authenticated;
grant execute on function public.marina_role(uuid) to authenticated;

-- ---------------------------------------------------------------
-- Table privileges (row level security decides which rows)
-- ---------------------------------------------------------------

grant select, insert, update, delete on
  public.organizations,
  public.organization_members,
  public.marinas,
  public.map_layouts,
  public.docks,
  public.slips
to authenticated;

-- ---------------------------------------------------------------
-- organizations
-- New organizations are created from the Supabase dashboard / SQL for now.
-- ---------------------------------------------------------------

create policy "Members can view their organizations"
  on public.organizations for select to authenticated
  using (public.org_role(id) is not null);

create policy "Owners can update their organizations"
  on public.organizations for update to authenticated
  using (public.org_role(id) = 'owner')
  with check (public.org_role(id) = 'owner');

-- ---------------------------------------------------------------
-- organization_members
-- ---------------------------------------------------------------

create policy "Members can view members of their organizations"
  on public.organization_members for select to authenticated
  using (public.org_role(organization_id) is not null);

create policy "Owners can manage members"
  on public.organization_members for all to authenticated
  using (public.org_role(organization_id) = 'owner')
  with check (public.org_role(organization_id) = 'owner');

-- ---------------------------------------------------------------
-- marinas
-- ---------------------------------------------------------------

create policy "Members can view marinas"
  on public.marinas for select to authenticated
  using (public.org_role(organization_id) is not null);

create policy "Owners can add marinas"
  on public.marinas for insert to authenticated
  with check (public.org_role(organization_id) = 'owner');

create policy "Owners and managers can update marinas"
  on public.marinas for update to authenticated
  using (public.org_role(organization_id) in ('owner', 'manager'))
  with check (public.org_role(organization_id) in ('owner', 'manager'));

create policy "Owners can delete marinas"
  on public.marinas for delete to authenticated
  using (public.org_role(organization_id) = 'owner');

-- ---------------------------------------------------------------
-- map_layouts and docks
-- ---------------------------------------------------------------

create policy "Members can view map layouts"
  on public.map_layouts for select to authenticated
  using (public.marina_role(marina_id) is not null);

create policy "Owners and managers can edit map layouts"
  on public.map_layouts for all to authenticated
  using (public.marina_role(marina_id) in ('owner', 'manager'))
  with check (public.marina_role(marina_id) in ('owner', 'manager'));

create policy "Members can view docks"
  on public.docks for select to authenticated
  using (public.marina_role(marina_id) is not null);

create policy "Owners and managers can edit docks"
  on public.docks for all to authenticated
  using (public.marina_role(marina_id) in ('owner', 'manager'))
  with check (public.marina_role(marina_id) in ('owner', 'manager'));

-- ---------------------------------------------------------------
-- slips (staff can update, e.g. change status)
-- ---------------------------------------------------------------

create policy "Members can view slips"
  on public.slips for select to authenticated
  using (public.marina_role(marina_id) is not null);

create policy "Owners and managers can edit slips"
  on public.slips for all to authenticated
  using (public.marina_role(marina_id) in ('owner', 'manager'))
  with check (public.marina_role(marina_id) in ('owner', 'manager'));

create policy "Staff can update slips"
  on public.slips for update to authenticated
  using (public.marina_role(marina_id) = 'staff')
  with check (public.marina_role(marina_id) = 'staff');
