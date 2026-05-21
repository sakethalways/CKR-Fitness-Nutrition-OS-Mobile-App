# Supabase backend — migrations

This folder holds the SQL that defines the CKR Nutrition OS backend. Each
migration is a `.sql` file in `migrations/`, numbered in run order.

## How to run a migration

1. Open your Supabase project → **SQL Editor** → **New query**.
2. Open the migration file from this folder.
3. **Copy all of it**, paste into the SQL editor, click **Run**.

All migrations are idempotent (safe to re-run from the top).

## Run order

| # | File | What it does |
|---|---|---|
| 1 | [`migrations/001_phase_b1_schema.sql`](migrations/001_phase_b1_schema.sql) | Tables, RLS, real-time publication, storage bucket, 24-meal seed, **admin bootstrap** |

## Before running migration 001

Create the admin auth user **first** in the Supabase Dashboard:

1. **Authentication → Users → Add user → Create new user**
2. Email: `chandrakiranreddygaddam@gmail.com`
3. Password: `adm7780`
4. **Auto Confirm User: ON**
5. Create user

The migration's bottom block looks up that user by email, stamps
`app_metadata.role = "admin"`, and inserts the matching row in
`public.admins` — no UUID juggling required.

If you accidentally run the migration before creating the user, you'll see
a notice telling you to create it. Just create the user and re-run.

## After running migration 001

Verify:
- **Table Editor → `meals`** has 24 rows
- **Table Editor → `admins`** has 1 row with name "CKR Admin"
- **Database → Publications → `supabase_realtime`** has 5 tables enabled:
  `notifications`, `clients`, `plans`, `meal_plan_templates`, `trainers`
- **Storage → `avatars`** bucket exists (public)

Sanity-check the admin role from SQL Editor while signed in as admin (use
**Settings → Database → Roles → switch to authenticated** if needed):
```sql
select public.is_admin();   -- should return true
select * from public.admins; -- should return 1 row
```

See the top-level [BACKEND_SETUP.md](../BACKEND_SETUP.md) for the full
step-by-step.

## File layout

```
supabase/
├── README.md
├── migrations/
│   └── 001_phase_b1_schema.sql
└── functions/
    ├── _shared/cors.ts
    ├── create_trainer/index.ts
    ├── delete_trainer/index.ts
    ├── update_trainer_password/index.ts
    └── README.md
```
