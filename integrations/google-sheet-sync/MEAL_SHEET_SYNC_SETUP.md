# Meals ⇄ Google Sheet — two-way sync setup

This connects a Google Sheet to your Supabase `meals` table **both ways**:

- Edit a cell in the sheet → the app updates (within ~1 minute).
- Add / edit / delete a meal in the app → the sheet updates on the next sync.
- Delete a row in the sheet → the meal is deleted in the app.
- Delete a meal in the app → its row disappears from the sheet.

**It works in production** (Play Store builds included): the sync is entirely
cloud-side — Google Apps Script ↔ a Supabase Edge Function ↔ your database.
The app just reads the `meals` table over realtime, exactly as it already does.
Nothing about the sync ships inside the app.

**Conflict rule (last-write-wins):** if the *same* meal is edited in *both* the
sheet and the app between two syncs, the most recently saved edit wins; the
other is overwritten. Different meals never conflict.

---

## Prerequisites

Apply these migrations in the Supabase SQL editor first (in order):

- `021_add_reel_url_and_meal_code.sql` — adds `reel_url` + `meal_code`.
- `022_meal_deletions_tombstones.sql` — lets app-side deletes reach the sheet.

---

> **No command line needed.** Everything below is done in the Supabase website
> and Google in your browser.

## Step 1 — Create the Edge Function (Supabase website)

1. Open your project at https://supabase.com/dashboard → left sidebar
   **Edge Functions** → **Create a function** (choose "via Editor" / "Create
   via the dashboard" if asked).
2. Name it exactly **`meals-sync`**.
3. Delete the sample code, paste the **entire** contents of
   `supabase/functions/meals-sync/index.ts`, then **Deploy**.
4. After it deploys, the page shows the function's **URL**. Copy it — it looks
   like `https://<your-project-ref>.supabase.co/functions/v1/meals-sync`.
   (You don't need to change any "Verify JWT" setting — the script handles it.)

## Step 2 — Set the secret (Supabase website)

1. Still in **Edge Functions** → **Secrets** (or "Manage secrets").
2. Add a secret named **`SHEET_SYNC_SECRET`** with a long random value
   (mash the keyboard, ~30 characters). **Save it somewhere** — you'll paste the
   same value into Google in Step 4.
3. `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` already exist automatically —
   leave them alone.

You'll also need your **anon key** (a public key, safe to use here): left
sidebar **Project Settings → API → Project API keys → `anon` `public`**. Copy it.

## Step 3 — Create the sheet + script

1. Create a new Google Sheet. Rename the first tab to **`Meals`** (exactly).
2. **Leave it empty** (no header, no rows). The first sync fills it from the DB.
   ⚠️ Do **not** pre-type meals before the first sync, or you'll create
   duplicates. Always pull first, then edit.
3. `Extensions → Apps Script`. Delete the sample code, paste the contents of
   **`Code.gs`** (in this folder), and Save.
4. `Project Settings (gear icon) → Script properties → Add script property`,
   add **three** (click "Add script property" for each):
   - `FUNCTION_URL` = the function URL you copied in Step 1.4.
   - `SYNC_SECRET`  = the same value you set for `SHEET_SYNC_SECRET` in Step 2.2.
   - `ANON_KEY`     = the anon public key you copied at the end of Step 2.
   Save.

## Step 4 — First sync + enable auto-sync

1. Reload the spreadsheet. A **`CKR Sync`** menu appears.
2. `CKR Sync → Sync now`. Approve the permissions prompt the first time.
   The sheet fills with all current meals (one row per calorie bracket).
3. `CKR Sync → Install auto-sync (every 5 min)`. This adds:
   - a time trigger that reconciles every 5 minutes (the safety net that also
     catches row deletions), and
   - an on-edit trigger that stamps which rows a human changed.

3. `CKR Sync → Set up dropdowns & rules` (run once). Strict dropdowns on
   `meal_type` / `diet` / `cal_bracket` (no typos possible); convenience
   dropdowns on `client_tags` / `allergens` (pick one, or type several
   comma-separated — a harmless orange triangle may show on multi-value cells).

That's it. Your team edits the sheet; the app follows.

## Team workflow (multiple editors)

- Just edit cells — Google Sheets auto-saves; there's no save button.
- Changes reach the app within 5 minutes (or instantly via `CKR Sync → Sync now`).
- Several people can edit at once; the sync reads the whole sheet each time.
- House rules: after editing a cell press Enter / click away; don't rename,
  reorder or delete columns; don't touch the hidden `sheet_updated_at` column.
- `meal_type` / `diet` / `cal_bracket` are dropdowns — pick from the list.
- `client_tags` / `allergens` can hold several values separated by commas
  (e.g. `Nuts, Dairy`); allowed words are in the column's note, and the sync
  auto-corrects capitalisation.

---

## Using the sheet

- **Add a reel link:** paste an `instagram.com/reel/...` URL into the `reel_url`
  cell. Leave blank for no reel (no button shows in the app).
- **Edit any value:** just type. It syncs on the next cycle (≤5 min) or
  immediately with `CKR Sync → Sync now`.
- **Add a meal:** add a new row and fill the columns **except `id`** (leave `id`
  blank — the database assigns it and writes it back). Required: `meal_number`,
  `meal_name`, `meal_type` (`Breakfast` / `Lunch / Dinner` / `Snack`), `diet`
  (`Veg` / `Non-Veg`), `cal_bracket`, `quantities`, `calories` (> 0).
- **Delete a meal:** delete the whole row.
- **Multi-value columns** (`client_tags`, `allergens`): comma-separated, e.g.
  `Nuts, Dairy`.
- **Don't touch** the hidden `sheet_updated_at` column (it's how the sync knows
  what changed). It's hidden by default.

> The sheet briefly refreshes during each sync (it's rewritten to match the
> database). Avoid typing in the exact second a sync runs; if a sync overwrites
> something you were mid-typing, just re-enter it.

---

## Troubleshooting

- **"Missing Script Property"** → you skipped Step 3.4; add all three:
  `FUNCTION_URL`, `SYNC_SECRET`, `ANON_KEY`.
- **"Sync failed (401)"** → `SYNC_SECRET` (sheet) ≠ `SHEET_SYNC_SECRET`
  (Supabase). Re-set both to the same value.
- **"Sync failed (500): insert: ... violates check constraint"** → a row has a
  bad value (e.g. `calories` ≤ 0, or a `diet`/`meal_type` outside the allowed
  set). Fix the row and sync again.
- **A meal won't delete from the app** → confirm migration 022 is applied and
  run `CKR Sync → Sync now`.
- **See logs:** Apps Script editor → `Executions` shows each run and any error.
