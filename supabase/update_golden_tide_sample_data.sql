-- Marina Command: update an EXISTING Golden Tide Marina to the current sample data.
-- Run once in the Supabase SQL Editor if you already ran an earlier seed.sql.
-- Run the boats migration (20261029120000_add_boats.sql) first.
-- (A fresh database does not need this: seed.sql already has everything.)
--
-- Replaces the marina's docks, slips and boats with: three identical docks
-- (A, B, C) with T heads, 24 slips each in three sizes, sample statuses and
-- 48 sample boats. Owner names, phone numbers and emails are made up.
-- WARNING: this deletes the marina's current docks, slips and boats (and any
-- changes you made to them). Safe to run more than once.

do $$
declare
  v_marina   uuid;
  v_dock_w   constant numeric := 8;    -- dock walkway width
  v_start    constant numeric := 18;   -- y where each dock (and its T head) starts
  v_first    constant numeric := 27;   -- y where the first slip starts, below the T head
  v_edge     constant numeric := 8;    -- dock length past the last slip
  v_dock     uuid;
  v_slip     uuid;
  d          record;
  b          record;
  v_y        numeric;
  v_slip_len numeric;
  v_slip_wid numeric;
  r          int;
  side       int;
begin
  select id into v_marina from public.marinas where name = 'Golden Tide Marina';
  if v_marina is null then
    raise exception 'Golden Tide Marina not found. Run seed.sql instead.';
  end if;

  -- deleting docks also deletes their slips
  delete from public.boats where marina_id = v_marina;
  delete from public.docks where marina_id = v_marina;

  update public.map_layouts set width = 500, height = 220 where marina_id = v_marina;
  insert into public.map_layouts (marina_id, width, height)
  select v_marina, 500, 220
  where not exists (select 1 from public.map_layouts where marina_id = v_marina);

  -- Docks A, B and C are identical. Down each dock the slips come in three sizes,
  -- two slips (one per side) per row:
  --   rows 1-4   28 x 12 ft  (small)
  --   rows 5-8   36 x 14 ft  (medium)
  --   rows 9-12  48 x 16 ft  (large)
  for d in
    select * from (values ('A', 90), ('B', 250), ('C', 410)) as t(name, x)
  loop
    -- from the dock's start, past the T head, along all 12 rows (168 ft), plus a little extra
    insert into public.docks (marina_id, name, length, width, map_x, map_y, rotation)
    values (v_marina, d.name, (v_first - v_start) + 168 + v_edge, v_dock_w,
            d.x, round(v_start + ((v_first - v_start) + 168 + v_edge) / 2, 2), 90)
    returning id into v_dock;

    v_y := v_first;
    for r in 1 .. 12 loop
      v_slip_len := case when r <= 4 then 28 when r <= 8 then 36 else 48 end;
      v_slip_wid := case when r <= 4 then 12 when r <= 8 then 14 else 16 end;

      -- left slip (odd number) west of the dock, right slip (even) east of it
      for side in 0 .. 1 loop
        insert into public.slips
          (marina_id, dock_id, name, length, width, status, map_x, map_y, rotation)
        values (
          v_marina,
          v_dock,
          d.name || '-' || lpad(((r - 1) * 2 + side + 1)::text, 2, '0'),
          v_slip_len,
          v_slip_wid,
          'available',
          round(d.x + (case when side = 0 then -1 else 1 end) * (v_dock_w / 2 + v_slip_len / 2.0), 2),
          round(v_y + v_slip_wid / 2.0, 2),
          0
        );
      end loop;

      v_y := v_y + v_slip_wid;
    end loop;
  end loop;

  -- Statuses and boats. Slips not listed here stay 'available'.
  -- (slip, status, boat name, boat type, boat length ft, registration, owner, phone, email)
  for b in
    select * from (values
    ('A-01', 'occupied', 'Fair Winds', 'Sailboat', 19, 'MA 8700 NN', 'Emily Hughes', '(617) 555-0106', 'emily.hughes@example.com'),
    ('A-02', 'occupied', 'Blue Heron', 'Runabout', 23, 'MA 5420 LC', 'Joseph Doyle', '(617) 555-0199', 'joseph.doyle@example.com'),
    ('A-04', 'occupied', 'Bay Runner', 'Pontoon', 19, 'MA 2933 EH', 'James Foley', '(617) 555-0197', 'james.foley@example.com'),
    ('A-05', 'reserved', 'Misty Morning', 'Bowrider', 25, 'MA 8976 FW', 'James O''Brien', '(617) 555-0159', 'james.obrien@example.com'),
    ('A-06', 'occupied', 'Ebb & Flow', 'Center console', 24, 'MA 3145 PN', 'Raymond Doyle', '(617) 555-0193', 'raymond.doyle@example.com'),
    ('A-07', 'occupied', 'Sea Glass', 'Bowrider', 20, 'MA 5420 KA', 'Gregory Hughes', '(617) 555-0100', 'gregory.hughes@example.com'),
    ('A-08', 'reserved', 'Merganser', 'Bowrider', 25, 'MA 2643 BE', 'Olivia Underhill', '(617) 555-0182', 'olivia.underhill@example.com'),
    ('A-10', 'occupied', 'Reel Therapy', 'Express cruiser', 27, 'MA 6389 KN', 'Kevin Sullivan', '(617) 555-0198', 'kevin.sullivan@example.com'),
    ('A-11', 'maintenance', null, null, null, null, null, null, null),
    ('A-12', 'occupied', 'Windchaser', 'Sportfisher', 33, 'MA 4981 AM', 'Susan Hughes', '(617) 555-0174', 'susan.hughes@example.com'),
    ('A-13', 'occupied', 'Salty Dog', 'Sailboat', 30, 'MA 3223 NF', 'Daniel Thibault', '(617) 555-0161', 'daniel.thibault@example.com'),
    ('A-16', 'occupied', 'Anchor Management', 'Sailboat', 32, 'MA 4109 FW', 'Steven Vasquez', '(617) 555-0131', 'steven.vasquez@example.com'),
    ('A-17', 'occupied', 'Dolphin Dance', 'Motor yacht', 34, 'MA 7905 BD', 'Henry Underhill', '(617) 555-0110', 'henry.underhill@example.com'),
    ('A-19', 'occupied', 'Lucky Strike', 'Sportfisher', 41, 'MA 7416 JP', 'Raymond Tanaka', '(617) 555-0130', 'raymond.tanaka@example.com'),
    ('A-20', 'reserved', 'Island Time', 'Trawler', 42, 'MA 2126 EH', 'Brian Lindqvist', '(617) 555-0122', 'brian.lindqvist@example.com'),
    ('A-23', 'occupied', 'Maggie May', 'Sailboat', 45, 'MA 2214 JG', 'Helen Vasquez', '(617) 555-0178', 'helen.vasquez@example.com'),
    ('A-24', 'occupied', 'Cape Cod Girl', 'Motor yacht', 34, 'MA 7740 RH', 'Maria Patel', '(617) 555-0134', 'maria.patel@example.com'),
    ('B-01', 'occupied', 'Northern Star', 'Bowrider', 19, 'MA 2102 KL', 'Samuel Patel', '(617) 555-0161', 'samuel.patel@example.com'),
    ('B-02', 'occupied', 'Breakwater', 'Runabout', 23, 'MA 7025 BE', 'Michael Prescott', '(617) 555-0169', 'michael.prescott@example.com'),
    ('B-03', 'maintenance', null, null, null, null, null, null, null),
    ('B-04', 'occupied', 'Patience', 'Sportfisher', 18, 'MA 7834 AS', 'Susan Gallagher', '(617) 555-0109', 'susan.gallagher@example.com'),
    ('B-07', 'occupied', 'Second Wind', 'Center console', 19, 'MA 1203 CC', 'Beth Quinn', '(617) 555-0148', 'beth.quinn@example.com'),
    ('B-08', 'reserved', 'North Shore', 'Sailboat', 25, 'MA 6409 NR', 'Kevin Foley', '(617) 555-0193', 'kevin.foley@example.com'),
    ('B-09', 'occupied', 'Gull''s Rest', 'Trawler', 27, 'MA 9430 AK', 'Walter Murphy', '(617) 555-0166', 'walter.murphy@example.com'),
    ('B-11', 'occupied', 'Sea Breeze', 'Sportfisher', 26, 'MA 2849 SS', 'Henry Rivera', '(617) 555-0129', 'henry.rivera@example.com'),
    ('B-13', 'occupied', 'Kittiwake', 'Sportfisher', 33, 'MA 4318 TF', 'Hannah Bianchi', '(617) 555-0118', 'hannah.bianchi@example.com'),
    ('B-14', 'occupied', 'The Reluctant Angler', 'Cruiser', 29, 'MA 7631 JG', 'Alice Moreau', '(617) 555-0141', 'alice.moreau@example.com'),
    ('B-15', 'reserved', 'Salt & Pepper', 'Sailboat', 33, 'MA 6185 GE', 'Emily Quinn', '(617) 555-0128', 'emily.quinn@example.com'),
    ('B-16', 'occupied', 'Mackerel Sky', 'Express cruiser', 33, 'MA 2050 JF', 'Andrew Chen', '(617) 555-0191', 'andrew.chen@example.com'),
    ('B-18', 'occupied', 'Osprey', 'Trawler', 44, 'MA 7782 NT', 'Henry Sheehan', '(617) 555-0127', 'henry.sheehan@example.com'),
    ('B-20', 'reserved', 'Wanderlust', 'Catamaran', 43, 'MA 6248 CB', 'Thomas Vasquez', '(617) 555-0157', 'thomas.vasquez@example.com'),
    ('B-21', 'occupied', 'Sweet Caroline', 'Sailboat', 40, 'MA 6803 KA', 'Robert Sheehan', '(617) 555-0173', 'robert.sheehan@example.com'),
    ('B-22', 'maintenance', null, null, null, null, null, null, null),
    ('B-23', 'occupied', 'Whisper', 'Motor yacht', 44, 'MA 5364 HE', 'Diane Doyle', '(617) 555-0103', 'diane.doyle@example.com'),
    ('B-24', 'occupied', 'Mariner''s Lady', 'Sailboat', 37, 'MA 9771 MC', 'Karen Prescott', '(617) 555-0113', 'karen.prescott@example.com'),
    ('C-03', 'occupied', 'Knot Working', 'Sportfisher', 23, 'MA 4225 AN', 'Daniel Prescott', '(617) 555-0158', 'daniel.prescott@example.com'),
    ('C-04', 'occupied', 'Harbor Lights', 'Bowrider', 21, 'MA 4356 DD', 'Diane Okafor', '(617) 555-0183', 'diane.okafor@example.com'),
    ('C-05', 'reserved', 'Tidewalker', 'Pontoon', 18, 'MA 9797 LJ', 'Peter Murphy', '(617) 555-0139', 'peter.murphy@example.com'),
    ('C-07', 'occupied', 'Stormy Petrel', 'Sportfisher', 24, 'MA 1608 RL', 'Andrew Keane', '(617) 555-0110', 'andrew.keane@example.com'),
    ('C-08', 'reserved', 'Tern', 'Center console', 20, 'MA 4576 CP', 'Rachel Ibrahim', '(617) 555-0103', 'rachel.ibrahim@example.com'),
    ('C-10', 'occupied', 'Lady Margaret', 'Trawler', 33, 'MA 3301 SE', 'Walter Whitaker', '(617) 555-0187', 'walter.whitaker@example.com'),
    ('C-11', 'occupied', 'Driftwood', 'Trawler', 30, 'MA 2409 HR', 'Alice Thibault', '(617) 555-0188', 'alice.thibault@example.com'),
    ('C-12', 'occupied', 'Little Dipper', 'Trawler', 30, 'MA 3692 TT', 'Leo Pereira', '(617) 555-0181', 'leo.pereira@example.com'),
    ('C-13', 'reserved', 'Copper Penny', 'Trawler', 30, 'MA 4411 KE', 'Sarah Quinn', '(617) 555-0178', 'sarah.quinn@example.com'),
    ('C-14', 'occupied', 'Halcyon', 'Trawler', 26, 'MA 7735 WD', 'Joseph Ibrahim', '(617) 555-0125', 'joseph.ibrahim@example.com'),
    ('C-15', 'occupied', 'Fiddler''s Green', 'Cruiser', 27, 'MA 9819 BT', 'Samuel Quinn', '(617) 555-0103', 'samuel.quinn@example.com'),
    ('C-17', 'occupied', 'Moonraker', 'Trawler', 40, 'MA 3732 CW', 'Alice Murphy', '(617) 555-0188', 'alice.murphy@example.com'),
    ('C-19', 'occupied', 'Sandpiper', 'Catamaran', 40, 'MA 8752 SE', 'Olivia Sheehan', '(617) 555-0131', 'olivia.sheehan@example.com'),
    ('C-20', 'occupied', 'Quiet Harbor', 'Sportfisher', 34, 'MA 2779 GP', 'Henry Lindqvist', '(617) 555-0140', 'henry.lindqvist@example.com'),
    ('C-21', 'occupied', 'Serenity Now', 'Sailboat', 37, 'MA 1373 BG', 'Kevin Walsh', '(617) 555-0189', 'kevin.walsh@example.com'),
    ('C-22', 'maintenance', null, null, null, null, null, null, null),
    ('C-23', 'occupied', 'Pilot Whale', 'Motor yacht', 41, 'MA 6822 HS', 'James Larson', '(617) 555-0141', 'james.larson@example.com')
    ) as t(slip_name, status, boat_name, boat_type, boat_length, registration, owner_name, owner_phone, owner_email)
  loop
    update public.slips
    set status = b.status
    where marina_id = v_marina and name = b.slip_name
    returning id into v_slip;

    if b.boat_name is not null then
      insert into public.boats
        (marina_id, slip_id, name, type, length, registration, owner_name, owner_phone, owner_email)
      values
        (v_marina, v_slip, b.boat_name, b.boat_type, b.boat_length, b.registration,
         b.owner_name, b.owner_phone, b.owner_email);
    end if;
  end loop;
end
$$;
