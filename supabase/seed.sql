-- Marina Command: seed data for Golden Tide Marina
-- Run once, after the migrations. Dimensions and positions are in feet.
--
-- Map layout (canvas 500 x 200 ft, shoreline along the top edge):
--   Dock A - 16 slips,  30 ft long x 14 ft wide
--   Dock B - 16 slips,  40 ft long x 16 ft wide
--   Dock C - 12 slips,  50 ft long x 20 ft wide
-- Each dock runs down from the shore with slips on both sides.
-- Odd-numbered slips are on the left (west) side, even on the right (east).

do $$
declare
  v_org     uuid;
  v_marina  uuid;
  v_dock    uuid;
  d         record;
  v_length  numeric;   -- dock length
  v_dock_w  constant numeric := 8;    -- dock walkway width
  v_shore   constant numeric := 20;   -- y position where the docks start
  v_count   int := 0;                 -- running slip counter (for sample statuses)
  i         int;
begin
  insert into public.organizations (name)
  values ('Golden Tide Marina')
  returning id into v_org;

  insert into public.marinas (organization_id, name)
  values (v_org, 'Golden Tide Marina')
  returning id into v_marina;

  insert into public.map_layouts (marina_id, width, height)
  values (v_marina, 500, 200);

  for d in
    select *
    from (values
      ('A',  80,  8, 30, 14),
      ('B', 230,  8, 40, 16),
      ('C', 390,  6, 50, 20)
    ) as t(name, x, per_side, slip_length, slip_width)
  loop
    -- dock is as long as its slips plus a little extra at the end
    v_length := d.per_side * d.slip_width + 10;

    -- docks run top to bottom, so they are rotated 90 degrees
    insert into public.docks (marina_id, name, length, width, map_x, map_y, rotation)
    values (v_marina, d.name, v_length, v_dock_w, d.x, round(v_shore + v_length / 2, 2), 90)
    returning id into v_dock;

    for i in 0 .. d.per_side * 2 - 1 loop
      v_count := v_count + 1;

      insert into public.slips
        (marina_id, dock_id, name, length, width, status, map_x, map_y, rotation)
      values (
        v_marina,
        v_dock,
        d.name || '-' || lpad((i + 1)::text, 2, '0'),
        d.slip_length,
        d.slip_width,
        -- sample statuses so the map has some variety
        case
          when v_count % 11 = 0 then 'maintenance'
          when v_count % 7  = 0 then 'reserved'
          when v_count % 3  = 0 then 'available'
          else 'occupied'
        end,
        -- left side (even i) sits west of the dock, right side east of it
        round(d.x + (case when i % 2 = 0 then -1 else 1 end) * (v_dock_w / 2 + d.slip_length / 2.0), 2),
        round(v_shore + (i / 2 + 0.5) * d.slip_width, 2),
        0
      );
    end loop;
  end loop;
end
$$;
