-- Marina Command: update an EXISTING Golden Tide Marina to the new map layout.
-- Run once in the Supabase SQL Editor if you already ran the earlier seed.sql.
-- (A fresh database does not need this: the new seed.sql already has the layout.)
--
-- Replaces the old docks and slips with three identical docks (A, B, C):
-- 24 slips each (12 per side), every slip 30 x 14 ft, 72 slips in total.
-- WARNING: this deletes the marina's current docks and slips (and so any slip
-- statuses you changed) and recreates them with the sample statuses.
-- Safe to run more than once. Dimensions and positions are in feet.

do $$
declare
  v_marina   uuid;
  v_dock     uuid;
  d          record;
  v_length   numeric;
  v_dock_w   constant numeric := 8;
  v_start    constant numeric := 18;
  v_first    constant numeric := 27;
  v_per_side constant int := 12;
  v_slip_len constant numeric := 30;
  v_slip_wid constant numeric := 14;
  v_count    int := 0;
  i          int;
begin
  select id into v_marina from public.marinas where name = 'Golden Tide Marina';
  if v_marina is null then
    raise exception 'Golden Tide Marina not found. Run seed.sql instead.';
  end if;

  -- deleting docks also deletes their slips
  delete from public.docks where marina_id = v_marina;

  update public.map_layouts set width = 500, height = 220 where marina_id = v_marina;
  insert into public.map_layouts (marina_id, width, height)
  select v_marina, 500, 220
  where not exists (select 1 from public.map_layouts where marina_id = v_marina);

  for d in
    select * from (values ('A', 90), ('B', 250), ('C', 410)) as t(name, x)
  loop
    v_length := (v_first - v_start) + v_per_side * v_slip_wid + 8;

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
        case
          when v_count % 11 = 0 then 'maintenance'
          when v_count % 7  = 0 then 'reserved'
          when v_count % 3  = 0 then 'available'
          else 'occupied'
        end,
        round(d.x + (case when i % 2 = 0 then -1 else 1 end) * (v_dock_w / 2 + v_slip_len / 2.0), 2),
        round(v_first + (i / 2 + 0.5) * v_slip_wid, 2),
        0
      );
    end loop;
  end loop;
end
$$;
