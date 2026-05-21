# Edge Functions

| Name | Purpose | Caller |
|---|---|---|
| `create_trainer` | Creates an auth user (synthetic email `tr_{mobile}@ckr.app`) + matching `public.trainers` row. Sets `app_metadata.role = 'trainer'`. Atomically rolls back on failure. | Admin only |
| `delete_trainer` | Hard-deletes a trainer auth user (cascades to `public.trainers`). | Admin only |

Both verify the caller's JWT has `app_metadata.role = 'admin'` before doing anything.

## Deploy

You need the [Supabase CLI](https://supabase.com/docs/guides/cli) installed:
```bash
npm install -g supabase
```

Then, from the project root:

```bash
# Login (once)
supabase login

# Link to your project (once)
supabase link --project-ref <your-project-ref>

# Deploy both functions
supabase functions deploy create_trainer
supabase functions deploy delete_trainer
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are
auto-injected by Supabase into the function runtime — no secrets to set.

## Verify

In Supabase Dashboard → **Edge Functions** → both functions should be
listed as deployed.

A quick smoke test from the SQL editor isn't possible (Edge Functions are
HTTP). Easiest verification: open the deployed app, log in as admin, tap
"New Trainer", fill the form, submit. If it succeeds, the function is wired.
