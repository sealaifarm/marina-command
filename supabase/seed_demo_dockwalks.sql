-- OPTIONAL demo data: two finished dockwalks for Golden Tide Marina (2 weeks and
-- 1 week ago) so the Dockwalks history and usage figures have something to show.
-- Run once, after the dockwalks migration and seed.sql. Safe to skip.
-- Readings are made up. A few slips are found different from the system, so the
-- mismatch flags show up too. Does nothing if Golden Tide already has dockwalks.

do $$
declare
  v_marina uuid;
  v_walk1  uuid;
  v_walk2  uuid;
begin
  select id into v_marina from public.marinas where name = 'Golden Tide Marina';
  if v_marina is null then
    raise exception 'Run seed.sql first: Golden Tide Marina not found';
  end if;
  if exists (select 1 from public.dockwalks where marina_id = v_marina) then
    raise notice 'Golden Tide already has dockwalks, nothing to do';
    return;
  end if;

  insert into public.dockwalks (marina_id, started_at, completed_at, walker_email)
  values (v_marina, now() - interval '14 days', now() - interval '14 days' + interval '48 minutes', 'dockhand@example.com')
  returning id into v_walk1;

  insert into public.dockwalks (marina_id, started_at, completed_at, walker_email)
  values (v_marina, now() - interval '7 days', now() - interval '7 days' + interval '52 minutes', 'dockhand@example.com')
  returning id into v_walk2;

  -- Walk 1: starting meter readings. Slips under maintenance are skipped.
  insert into public.dockwalk_entries
    (dockwalk_id, marina_id, slip_id, occupied, system_status, electric_kwh, water_gal)
  select
    v_walk1, v_marina, s.id,
    s.status = 'occupied',
    s.status,
    1000 + (abs(hashtext(s.name)) % 4000),
    5000 + (abs(hashtext(s.name || 'w')) % 20000)
  from public.slips s
  where s.marina_id = v_marina and s.status <> 'maintenance';

  -- Walk 2: a week of usage on top (boats use far more than empty slips).
  -- Roughly one slip in 17 is found different from its system status.
  insert into public.dockwalk_entries
    (dockwalk_id, marina_id, slip_id, occupied, system_status, electric_kwh, water_gal)
  select
    v_walk2, v_marina, s.id,
    (s.status = 'occupied') <> (abs(hashtext(s.name || 'm')) % 17 = 0),
    s.status,
    e.electric_kwh + case when s.status = 'occupied' then 35 + (abs(hashtext(s.name || 'e')) % 90) else abs(hashtext(s.name || 'e')) % 3 end,
    e.water_gal    + case when s.status = 'occupied' then 100 + (abs(hashtext(s.name || 'g')) % 700) else 0 end
  from public.slips s
  join public.dockwalk_entries e on e.slip_id = s.id and e.dockwalk_id = v_walk1
  where s.marina_id = v_marina;
end
$$;
