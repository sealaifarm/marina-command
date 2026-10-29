# Marina Command

A modern marina management CRM for Golden Tide Marina.

**Stack:** Next.js 16, TypeScript, Tailwind CSS 4, shadcn/ui, Supabase, GitHub, Vercel
**Modules (planned):** Management, Spaces, Leads, Storage

## Current state

- Step 1: Supabase database for Spaces → Marina Map (`supabase/`)
- Step 2: Login page and route protection
- Step 3: Sidebar and top bar
- Step 4: Marina Map at `/spaces/marina-map` (this step)

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
- docks from `docks`, slips from `slips`, both placed with `map_x`, `map_y`, `length`, `width`, `rotation`
- slip color from `slips.status`: available green, occupied blue, reserved yellow, maintenance red

Nothing is specific to one marina, so a marina with different docks, slip sizes or rotations simply draws differently. Hover a slip for its name, size and status. Colors are defined in one list at the top of `src/components/marina-map/marina-map.tsx`.

No new tables or migrations are needed. To see a second layout, optionally run `supabase/seed_demo_second_marina.sql` once in the SQL Editor (after `seed.sql`), then switch marinas in the sidebar.

Test it: open `/spaces/marina-map` and check Golden Tide shows docks A, B and C (44 slips, colored by status); in Supabase change one slip's `status`, refresh, and see its color change; run the optional demo SQL, switch to Harbor Point Marina, and see a different layout.
