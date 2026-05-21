# Backend setup — going live on Supabase

The app's stores (`useAuth`, `useData`, `useNotifications`, `useLibrary`) now
talk to Supabase. Only the static **meals** catalogue stays bundled
(in `src/data/meals.ts`, also mirrored into the `meals` table by the
migration).

Follow these steps in order.

---

## Step 1 — Create the Supabase project

1. Go to <https://app.supabase.com> → **New project**
2. Pick a region close to your users (e.g. Mumbai for India)
3. Pick a strong database password
4. Wait ~2 min for provisioning

---

## Step 2 — Create the admin auth user

In **Authentication → Users → Add user → Create new user**:

| Field | Value |
|---|---|
| Email | `chandrakiranreddygaddam@gmail.com` |
| Password | `adm7780` |
| Auto Confirm User | **ON** (check the toggle) |

Click **Create user**. (No need to edit metadata manually — the migration
SQL below will set the admin role automatically.)

---

## Step 3 — Run the schema migration

1. Open **SQL Editor → New query**
2. Open [`supabase/migrations/001_phase_b1_schema.sql`](supabase/migrations/001_phase_b1_schema.sql)
3. Copy the entire file → paste → **Run**

You should see at the bottom:
```
NOTICE: Admin bootstrap complete: chandrakiranreddygaddam@gmail.com (id ...)
```
If you see "Admin auth user not found", you skipped Step 2 — go back, create
the auth user, then re-run this migration (it's safely idempotent).

### What the migration just did

- Created 7 tables (admins, trainers, meals, clients, plans,
  meal_plan_templates, notifications)
- Enabled RLS + role-aware policies on each
- Added 5 tables to the `supabase_realtime` publication
- Created the public `avatars` storage bucket + per-user folder policies
- Seeded the 24 meals
- **Auto-stamped** `app_metadata.role = "admin"` on the user you created in
  Step 2, and inserted the matching row in `public.admins`

### Quick verification

In **Table Editor**:
- `meals` → 24 rows
- `admins` → 1 row, name = "CKR Admin"

In **Database → Publications → `supabase_realtime`**:
- Toggle should be ON for `notifications`, `clients`, `plans`,
  `meal_plan_templates`, `trainers`

In **Storage**:
- `avatars` bucket exists with **Public** = on

---

## Step 4 — Deploy the Edge Functions

Three admin-only operations that need the **service role key**
(which never ships to the client).

Install Supabase CLI (once):
```bash
npm install -g supabase
```

Link this project to your Supabase project (once):
```bash
supabase login
supabase link --project-ref unmstganlbqhdwdfzpnu
```

Deploy:
```bash
supabase functions deploy create_trainer
supabase functions deploy delete_trainer
supabase functions deploy update_trainer_password
```

Verify in **Dashboard → Edge Functions** — all three should be listed.

---

## Step 5 — Configure the client app

Your `.env` should look like exactly this (no other vars):
```
EXPO_PUBLIC_SUPABASE_URL=https://unmstganlbqhdwdfzpnu.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<your-anon-public-key>
```

Then:
```bash
npm install
npx expo start --clear
```

---

## Step 6 — Sign in

### Admin
On the login screen → tap **Admin** segment → enter password `adm7780` → Sign In.
You land on the Admin **Overview** tab.

### Trainers
Admin creates them in the app:
1. **Trainers** tab → **+ New Trainer** at the bottom
2. Fill name + 10-digit mobile + age + gender + password → **Create Trainer**

Sign out, switch to **Trainer** segment, enter that mobile + password → land on **Clients**.

---

## Architecture map

| Concern | File |
|---|---|
| Mobile-as-email + admin email mapping | `src/lib/supabase.ts` |
| Session restore + sign-in/out | `src/store/auth.ts` |
| Real-time clients / plans / trainers cache | `src/store/data.ts` |
| Per-user notification subscription | `src/store/notifications.ts` |
| Admin library templates | `src/store/library.ts` |
| Avatar upload (Storage bucket `avatars`) | `src/lib/storage.ts` |
| Admin-only mutations | Edge Functions: `create_trainer`, `delete_trainer`, `update_trainer_password` |
| RLS rules | `supabase/migrations/001_phase_b1_schema.sql` |
| Meal catalogue (static + DB mirror) | `src/data/meals.ts` + `meals` table |

## How the spec maps to RLS

- **Trainer can't delete a client** → policy `clients_delete_admin_only`
- **Trainer only sees own clients, admin sees all** → policy `clients_select_own_or_admin`
- **Admin-only library** → policy `templates_select_admin` / `templates_insert_admin`
- **Trainers can read each other's profiles (for avatar lookup) but only edit self** → `trainers_select_authenticated` + `trainers_update_self_or_admin`
- **Admin creates trainers** → service role only, gated by Edge Function (`create_trainer`)

## Reset during development

If you want to wipe all clients/plans/notifications and start fresh
(keeps trainers, admin, meals):
```sql
truncate
  public.notifications,
  public.meal_plan_templates,
  public.plans,
  public.clients
restart identity cascade;
```
