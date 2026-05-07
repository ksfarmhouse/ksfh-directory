# Kansas State FarmHouse Directory

Private directory for the Kansas State Chapter of FarmHouse Fraternity. Built with Next.js 16 (App Router) and Supabase.

> **Builder of Men** — established at Kansas State June 2, 1921

## Brand

This site follows the [FarmHouse Fraternity Style Guide v1.01](https://www.farmhouse.org). Key conventions:

- **Colors** — green `#006938`, gold `#ffce00`, gray `#54575a`. Preferred ratio 40% white / 40% green / 20% gold.
- **Type** — Helvetica/Arial system stack for web.
- **Capitalization** — *FarmHouse* (mixed case), *Fraternity* (capitalized when standing alone for FarmHouse), *Greek*, *PC '22*. Never use *frat*.
- **Member designation** — `John Doe (KS '22)` per the official directory (chapter abbreviation + initiation year).

The shield logo at [src/components/Logo.tsx](src/components/Logo.tsx) is a simplified inline SVG. Replace with the official vector files from the FarmHouse brand toolkit (Dropbox link in the style guide) when ready.

## Stack

- **Next.js 16** — App Router, TypeScript, Tailwind CSS
- **Supabase** — Postgres, Auth (Google OAuth), Row Level Security
- **Hosting** — designed for Vercel

## Features

- Google OAuth login (no public access)
- Searchable directory across all pledge classes
- Brothers create their own profile after signing in
- Admins manage the list of pledge classes and can add stub profiles for brothers who haven't signed up yet
- All sensitive data (phone, address) gated behind authentication

## Getting started

### 1. Create the Supabase project

1. Go to <https://supabase.com> and create a new project named `ksfh-directory`.
2. Wait for provisioning to finish.
3. Copy the project URL and `anon` key from **Settings → API**.

### 2. Configure Google OAuth

1. In the Google Cloud Console, create OAuth 2.0 credentials (Web application).
2. **Authorized redirect URI**: `https://YOUR-PROJECT-REF.supabase.co/auth/v1/callback`
3. In Supabase: **Authentication → Providers → Google**, paste the client ID and secret, enable.
4. In Supabase: **Authentication → URL Configuration**, add to **Site URL**: `http://localhost:3000`. Add to **Redirect URLs**:
   - `http://localhost:3000/auth/callback`
   - (Later) your production URL + `/auth/callback`

### 3. Run the schema migrations

In the Supabase SQL Editor, paste and run in order:

1. [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) — tables, RLS, functions
2. [`supabase/migrations/0002_pledge_classes_and_self_profile.sql`](supabase/migrations/0002_pledge_classes_and_self_profile.sql) — pledge classes table + self-service profile creation
3. [`supabase/migrations/0003_remove_claim_flow.sql`](supabase/migrations/0003_remove_claim_flow.sql) — drops claim flow + clears any seeded profiles

(There is no bulk seed step — brothers add themselves after signing in.)

### 4. Set up local env

```bash
cp .env.local.example .env.local
```

Fill in the Supabase URL and anon key. The service role key is optional for now (only needed if you add server-side admin scripts).

### 5. Install and run

```bash
npm install
npm run dev
```

Open <http://localhost:3000>.

### 6. Bootstrap the alumni chair as admin

The chair email (`ksfarmhouse@gmail.com`) needs an admin profile to manage the directory.

1. Sign in once with Google at <http://localhost:3000> as the chair email so the auth user is created.
2. In Supabase **SQL Editor**, run:

   ```sql
   insert into public.profiles
     (user_id, full_name, pledge_class, is_admin, personal_email, claimed_at)
   values (
     (select id from auth.users where email = 'ksfarmhouse@gmail.com'),
     'KSFH Alumni Chair',
     'Officer',
     true,
     'ksfarmhouse@gmail.com',
     now()
   );
   ```

3. Refresh — the **Admin** link appears in the nav.

### 7. Add pledge classes

In `/admin`, add the pledge classes brothers can pick from (e.g. `PC '22`, `PC '23`). Then share the site — brothers sign in, hit *My Profile*, fill out their info, and they show up in the directory immediately.

## Project layout

```
src/
  app/
    page.tsx                       # redirect to /directory or /login
    layout.tsx                     # root layout + nav + footer
    login/page.tsx                 # Google OAuth button
    auth/callback/route.ts         # OAuth code exchange
    auth/signout/route.ts          # sign out
    directory/page.tsx             # searchable list
    profile/me/page.tsx            # redirect to user's profile or /profile/new
    profile/new/page.tsx           # create your own profile
    profile/[id]/page.tsx          # view profile
    profile/[id]/edit/page.tsx     # edit (owner or admin)
    admin/page.tsx                 # admin dashboard
  components/
    NavBar.tsx
    Footer.tsx
    Logo.tsx                       # inline SVG crest
  lib/
    types.ts                       # shared TS types + Database type
    supabase/
      client.ts                    # browser client
      server.ts                    # RSC / server action client
      middleware.ts                # session refresh + auth gate
  middleware.ts                    # routes through lib/supabase/middleware

supabase/
  migrations/
    0001_init.sql                  # base schema, RLS, is_admin helper
    0002_pledge_classes_and_self_profile.sql
    0003_remove_claim_flow.sql
  seed.sql                         # empty (no bulk seed)
```

## Deploying to Vercel

1. Push this repo to GitHub.
2. Import to Vercel.
3. Add env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_SITE_URL` (your Vercel URL).
4. In Supabase **Authentication → URL Configuration**, add the production URL + `/auth/callback` to **Redirect URLs**.
5. In Google Cloud Console, add the production URL to **Authorized JavaScript origins** if needed.
