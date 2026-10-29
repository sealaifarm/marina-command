-- OPTIONAL demo data: a second marina with a different layout.
-- Run once, after the migrations and seed.sql. Safe to skip.
--
-- Adds "Harbor Point Marina" to the same organization as Golden Tide Marina
-- (so you can already see it), with a portrait 210 x 240 ft canvas and two
-- docks that run left to right, with slips turned sideways (rotation 90).
-- Use the marina selector in the sidebar to switch between the two maps.
-- Dimensions and positions are in feet.

do $$
declare
  v_org     uuid;
  v_marina  uuid;
  v_dock    uuid;
  d         record;
  v_length  numeric;
  v_count   int := 0;
  i         int;
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
  values (v_marina, 210, 240);

  for d in
    select *
    from (values
      ('Pier 1',  60, 6, 12, 28),
      ('Pier 2', 180, 8, 14, 34)
    ) as t(name, y, per_side, slip_width, slip_length)
  loop
    v_length := d.per_side * d.slip_width + 10;

    -- docks start at x = 30 and run to the right (rotation 0)
    insert into public.docks (marina_id, name, length, width, map_x, map_y, rotation)
    values (v_marina, d.name, v_length, 8, round(40 + v_length / 2, 2), d.y, 0)
    returning id into v_dock;

    for i in 0 .. d.per_side * 2 - 1 loop
      v_count := v_count + 1;

      insert into public.slips
        (marina_id, dock_id, name, length, width, status, map_x, map_y, rotation)
      values (
        v_marina,
        v_dock,
        (case when d.name = 'Pier 1' then 'P1' else 'P2' end) || '-' || lpad((i + 1)::text, 2, '0'),
        d.slip_length,
        d.slip_width,
        case
          when v_count % 9 = 0 then 'maintenance'
          when v_count % 5 = 0 then 'reserved'
          when v_count % 3 = 0 then 'available'
          else 'occupied'
        end,
        -- slips sit side by side along the dock
        round(40 + (i / 2 + 0.5) * d.slip_width, 2),
        -- even i above the dock, odd i below it
        round(d.y + (case when i % 2 = 0 then -1 else 1 end) * (4 + d.slip_length / 2.0), 2),
        -- turned 90 degrees so the slip's length points away from the dock
        90
      );
    end loop;
  end loop;
end
$$;
