# Marina Command

A modern marina management CRM for Golden Tide Marina.

**Stack:** Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Supabase, GitHub, Vercel
**Modules (planned):** Management, Spaces, Leads, Storage

## Current state

- Step 1: Supabase database for Spaces → Marina Map (`supabase/`)
- Step 2: Login page and route protection
- Step 3: Sidebar and top bar
- Step 4: Marina Map at `/spaces/marina-map`
- Step 5: Dockwalks at `/spaces/dockwalks` (this step)

Signed-out visitors can only see `/login`. Everything else requires a signed-in user.

```
public/login-hero.webp        marina photo for the login page (you provide this)
public/logo.png               your logo, used on the login page and at the top of the sidebar (you provide this)
src/proxy.ts                  runs on every page request: refreshes the session, redirects
src/lib/supabase/             Supabase helpers (env, server client, session refresh)
src/app/login/                login page, form and sign-in action
src/app/(app)/                protected pages (home, Spaces → Marina Map, Leads, Storage)
src/components/app-shell/     sidebar, top bar, marina selector, tooltip
src/components/marina-map/    draws a marina's docks and slips from database rows
src/components/dockwalks/     dockwalk form and report
src/lib/dockwalks.ts          dockwalk data loading (server)
src/components/ui/            shadcn-style Button, Input, Label
supabase/                     migrations, seed, and optional demo marina
```

## Configure

### 1. Environment variables

Create `.env.local` (copy `.env.example`) and fill in the values from Supabase → **Project Settings → API**:

```
NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-or-publishable-key
```

`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` also works if that's the name your project uses.

On **Vercel**, add the same two variables under **Project Settings → Environment Variables** (Production and Preview), then redeploy. If you connected Supabase through the Vercel integration, they may already be there.

### 2. Logo and marina photo

Put your logo at `public/logo.png`. It appears on the login page and at the top of the sidebar. In the collapsed sidebar only the left 40px of the logo shows, so a logo that starts with a square mark works best.


Put your photo at `public/login-hero.webp`. Until it's there, the left side of the login page shows a plain warm panel.

### 3. A user to sign in with

In Supabase go to **Authentication → Users → Add user**, enter an email and password, and turn on **Auto Confirm User**.

Then give that user access to the marina (this is the snippet from the database step, using your email):

```sql
insert into organization_members (organization_id, user_id, role)
select o.id, u.id, 'owner'
from organizations o, auth.users u
where o.name = 'Golden Tide Marina'
  and u.email = 'you@example.com';
```

Recommended: since there's no sign-up page, turn off new user sign-ups in your Supabase Authentication settings so only people you add can have accounts.

### 4. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Test it

1. Open `/` while signed out. You should land on `/login`.
2. Submit the empty form. You should see "Enter your email and password to continue."
3. Sign in with a wrong password. You should see a clear error, and your email stays filled in.
4. Sign in with the correct details. The button shows "Signing in…", then you land on the home page with your email in the header.
5. While signed in, open `/login`. You should be sent back to `/`.
6. Click **Sign out**. You return to `/login`, and `/` is protected again.

## Sidebar

- **Collapse:** the round button on the sidebar edge (desktop) switches between the full sidebar and an icon-only rail. The choice is saved in a cookie, so it is remembered and there is no flash on reload.
- **Mobile:** the sidebar becomes a drawer opened from the top bar. It always shows full labels.
- **Marina selector:** below the logo. It lists the marinas the signed-in user can access and remembers the choice (cookie `mc_marina`). It works in the rail too: click the pin icon.
- **Spaces:** expands to Marina Map. In the rail, the Spaces icon goes straight to Marina Map.
- **Add a page:** add a link in `src/components/app-shell/sidebar.tsx` and a title in `src/components/app-shell/nav.ts`.

## Database

See the `supabase/` folder. Run the two migrations in order, then `seed.sql` once, in the Supabase SQL Editor (or use the Supabase CLI: `supabase link`, then `supabase db push`; run `seed.sql` in the SQL Editor).

| Table | Purpose |
| --- | --- |
| `organizations` | A company that owns one or more marinas |
| `organization_members` | Who can access an organization, and their role |
| `marinas` | Marina locations |
| `map_layouts` | Map canvas size for a marina (one per marina) |
| `docks` | Docks, with their position on the map |
| `slips` | Slips, with status and position on the map |

All dimensions and map coordinates are in feet. Roles: `owner` (everything), `manager` (edit marinas, docks, slips, map), `staff` (view, and update slips).

Map positions: `map_x` / `map_y` are the center of the shape from the top-left of the canvas. `length` runs along the x axis at rotation 0, `width` along y, and `rotation` is degrees clockwise around the center.

To change the database later, add a new file in `supabase/migrations/` with a later timestamp. For each new table, enable row level security, add policies, and grant privileges to `authenticated`, following `20261028190100_add_row_level_security.sql`.

## Design

Warm off-white backgrounds, white surfaces, charcoal text, Montserrat, and `#7665E8` as the accent (primary buttons, active navigation, meaningful highlights). Generous whitespace, subtle borders, soft shadows, rounded cards, pill-shaped inputs and buttons. No gradients. The design tokens live in `src/app/globals.css`.

## Marina Map

`/spaces/marina-map` draws the marina chosen in the sidebar, entirely from the database:

- canvas size from `map_layouts` (if a marina has no layout row, the canvas is fitted around its docks and slips)
- docks from `docks`, slips from `slips`, both placed with `map_x`, `map_y`, `length`, `width`, `rotation`; each dock gets a T head sized to its slips
- slip color from `slips.status`: available green, occupied blue, reserved yellow, maintenance red

Click a slip (or focus it and press Enter) to highlight it and open a side panel with its dock, size, status, and the boat assigned to it: name, type, length, registration, owner and contact details. Close the panel with the X button, Escape, or by clicking empty water. On small screens the panel opens as a sheet at the bottom.

Nothing is specific to one marina, so a marina with different docks, slip sizes or rotations simply draws differently. Colors are defined in `src/components/marina-map/statuses.ts`.

### Boats

`public.boats` (migration `20261029120000_add_boats.sql`) holds each boat and the slip it is assigned to (`slip_id`, at most one boat per slip). An occupied slip shows the boat in it; a reserved slip shows the boat it is reserved for. Same access rules as slips: members can view, owners and managers can edit, staff can update.

### Database setup

Run in the Supabase SQL Editor, in this order:

1. `supabase/migrations/*.sql` (oldest first, including the boats and dockwalks migrations)
2. a fresh database: `supabase/seed.sql`
   an existing Golden Tide database (earlier seed already run): `supabase/update_golden_tide_sample_data.sql` instead. It replaces that marina's docks, slips and boats.
3. optional: `supabase/seed_demo_second_marina.sql` adds a second marina with a different layout (no boats).
4. optional: `supabase/seed_demo_dockwalks.sql` adds two finished sample dockwalks to Golden Tide, so the history and usage figures have something to show.

Golden Tide sample data: three identical docks (A, B, C), 24 slips each in three sizes (28 x 12, 36 x 14 and 48 x 16 ft), 72 slips: 39 occupied, 9 reserved, 4 under maintenance, 20 available, with 48 sample boats. People, phone numbers and emails are made up.

## Dockwalks

`/spaces/dockwalks` replaces paper dockwalk sheets. A dockwalk is one walk of the marina's docks:

1. **Start dockwalk** (one can be in progress per marina; anyone on the team can add to it).
2. Go dock by dock. For each slip, tap **Occupied** or **Empty** for what you actually see, and type the electric (kWh) and water (gallons) meter readings. Each field shows the last reading, and warns if the new one is lower. A note appears when what you found differs from the slip's status in the system.
3. **Save progress** whenever you like, then **Finish dockwalk**. Slips you skipped are reported as "not recorded".

A finished dockwalk is a read-only report: slips checked, how many were found occupied, how many differ from the system, and electric and water used since each slip's previous reading, per slip and in total. Past dockwalks are listed on the main page, newest first.

Data lives in `public.dockwalks` and `public.dockwalk_entries` (one row per slip per walk), plus the `dockwalk_summaries` view that feeds the history list. Meter readings are stored as read from the meter; usage is the difference between walks. Dockwalks do not change slip statuses. They only flag differences, and you update the slip yourself if the system is wrong.

Test it: start a dockwalk, mark a few slips, save, reload (they are still there), finish, and check the report. Run the optional demo SQL first to see usage figures straight away.
