-- OPTIONAL demo data: a second marina with a different layout.
-- Run once, after the migrations and seed.sql. Safe to skip.
--
-- Adds "Harbor Point Marina" to the same organization as Golden Tide Marina
-- (so you can already see it), with a portrait 220 x 220 ft canvas and two
-- identical docks that run left to right, with slips turned sideways
-- (rotation 90). Use the marina selector in the sidebar to switch between
-- the two maps. Dimensions and positions are in feet.

do $$
declare
  v_org      uuid;
  v_marina   uuid;
  v_dock     uuid;
  d          record;
  v_length   numeric;
  v_dock_w   constant numeric := 8;
  v_start    constant numeric := 40;   -- x where each dock (and its T head) starts
  v_first    constant numeric := 50;   -- x where the first slip starts
  v_per_side constant int := 8;
  v_slip_wid constant numeric := 12;   -- along the dock
  v_slip_len constant numeric := 28;   -- away from the dock
  v_count    int := 0;
  i          int;
begin
  select id into v_org from public.organizations where name = 'Golden Tide Marina';
  if v_org is null then
    raise exception 'Run seed.sql first: Golden Tide Marina organization not found';
  end if;

  if exists (select 1 from public.marinas where organization_id = v_org and name = 'Harbor Point Marina') then
    raise notice 'Harbor Point Marina already exists, nothing to do';
    return;
  end if;

  insert into public.marinas (organization_id, name, city, state)
  values (v_org, 'Harbor Point Marina', 'Quincy', 'MA')
  returning id into v_marina;

  insert into public.map_layouts (marina_id, width, height)
  values (v_marina, 220, 220);

  for d in
    select * from (values ('Pier 1', 60, 'P1'), ('Pier 2', 160, 'P2')) as t(name, y, prefix)
  loop
    v_length := (v_first - v_start) + v_per_side * v_slip_wid + 8;

    -- docks run left to right (rotation 0)
    insert into public.docks (marina_id, name, length, width, map_x, map_y, rotation)
    values (v_marina, d.name, v_length, v_dock_w, round(v_start + v_length / 2, 2), d.y, 0)
    returning id into v_dock;

    for i in 0 .. v_per_side * 2 - 1 loop
      v_count := v_count + 1;

      insert into public.slips
        (marina_id, dock_id, name, length, width, status, map_x, map_y, rotation)
      values (
        v_marina,
        v_dock,
        d.prefix || '-' || lpad((i + 1)::text, 2, '0'),
        v_slip_len,
        v_slip_wid,
        case
          when v_count % 9 = 0 then 'maintenance'
          when v_count % 5 = 0 then 'reserved'
          when v_count % 3 = 0 then 'available'
          else 'occupied'
        end,
        -- slips sit side by side along the dock
        round(v_first + (i / 2 + 0.5) * v_slip_wid, 2),
        -- even i above the dock, odd i below it
        round(d.y + (case when i % 2 = 0 then -1 else 1 end) * (v_dock_w / 2 + v_slip_len / 2.0), 2),
        -- turned 90 degrees so the slip's length points away from the dock
        90
      );
    end loop;
  end loop;
end
$$;
