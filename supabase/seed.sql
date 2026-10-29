-- Marina Command: seed data for Golden Tide Marina
-- Run once, after the migrations. Dimensions and positions are in feet.
--
-- Map layout (canvas 500 x 220 ft, shoreline along the top edge):
--   Docks A, B and C are identical: 24 slips each (12 per side), every slip
--   30 ft long x 14 ft wide. 72 slips in total.
-- Each dock runs down from the shore with a T head at the top and slips on
-- both sides. Odd-numbered slips are on the left (west), even on the right (east).

do $$
declare
  v_org      uuid;
  v_marina   uuid;
  v_dock     uuid;
  d          record;
  v_length   numeric;                  -- dock length
  v_dock_w   constant numeric := 8;    -- dock walkway width
  v_start    constant numeric := 18;   -- y where each dock (and its T head) starts
  v_first    constant numeric := 27;   -- y where the first slip starts, below the T head
  v_per_side constant int := 12;       -- slips on each side of a dock
  v_slip_len constant numeric := 30;
  v_slip_wid constant numeric := 14;
  v_count    int := 0;                 -- running slip counter (for sample statuses)
  i          int;
begin
  insert into public.organizations (name)
  values ('Golden Tide Marina')
  returning id into v_org;

  insert into public.marinas (organization_id, name)
  values (v_org, 'Golden Tide Marina')
  returning id into v_marina;

  insert into public.map_layouts (marina_id, width, height)
  values (v_marina, 500, 220);

  for d in
    select * from (values ('A', 90), ('B', 250), ('C', 410)) as t(name, x)
  loop
    -- from the dock's start, past the T head, along every slip, plus a little extra at the end
    v_length := (v_first - v_start) + v_per_side * v_slip_wid + 8;

    -- docks run top to bottom, so they are rotated 90 degrees
    insert into public.docks (marina_id, name, length, width, map_x, map_y, rotation)
    values (v_marina, d.name, v_length, v_dock_w, d.x, round(v_start + v_length / 2, 2), 90)
    returning id into v_dock;

    for i in 0 .. v_per_side * 2 - 1 loop
      v_count := v_count + 1;

      insert into public.slips
        (marina_id, dock_id, name, length, width, status, map_x, map_y, rotation)
      values (
        v_marina,
        v_dock,
        d.name || '-' || lpad((i + 1)::text, 2, '0'),
        v_slip_len,
        v_slip_wid,
        -- sample statuses so the map has some variety
        case
          when v_count % 11 = 0 then 'maintenance'
          when v_count % 7  = 0 then 'reserved'
          when v_count % 3  = 0 then 'available'
          else 'occupied'
        end,
        -- left side (even i) sits west of the dock, right side east of it
        round(d.x + (case when i % 2 = 0 then -1 else 1 end) * (v_dock_w / 2 + v_slip_len / 2.0), 2),
        round(v_first + (i / 2 + 0.5) * v_slip_wid, 2),
        0
      );
    end loop;
  end loop;
end
$$;
