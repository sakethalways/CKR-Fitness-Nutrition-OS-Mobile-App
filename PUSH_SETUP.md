# Real OS-Level Push Notifications — Setup Walkthrough

This guide turns on **real mobile push notifications** (banner on lock screen,
sound, tap-to-open the app). The code is already wired — you just need to run
the setup steps below once.

The whole flow:

```
Trainer adds client
    ↓
INSERT into notifications table
    ↓
Postgres trigger fires (migration 008)
    ↓
pg_net calls the send_push Edge Function
    ↓
Edge Function looks up the admin's device push tokens
    ↓
POSTs to Expo Push API
    ↓
Admin's phone receives push (banner + sound, even if app is closed)
    ↓
Admin taps it → app opens → routes to notifications inbox
```

There are **5 setup steps**. Do them once and you're done forever.

---

## Step 1 — Run migration 008 in Supabase

Open the Supabase SQL Editor and run
[`supabase/migrations/008_push_notifications.sql`](supabase/migrations/008_push_notifications.sql).

This creates:
- `device_push_tokens` table (with RLS — each user only sees their own rows)
- `notify_push_on_insert()` trigger function (calls the Edge Function on
  every INSERT into `notifications`)
- Enables the `pg_net` extension so SQL can make HTTP calls

You should see `Success. No rows returned`.

> The trigger is a **no-op** until step 4 below. Existing notification flows
> keep working — failures are logged as NOTICEs and never block the INSERT.

---

## Step 2 — Deploy the `send_push` Edge Function

Install the Supabase CLI if you don't have it:

```powershell
npm install -g supabase
supabase login
```

Link your project (one-time):

```powershell
supabase link --project-ref <YOUR_PROJECT_REF>
```

(Your project ref is the subdomain of your Supabase URL — e.g. for
`https://abcdxyz.supabase.co`, the ref is `abcdxyz`.)

Deploy the function:

```powershell
supabase functions deploy send_push --no-verify-jwt
```

`--no-verify-jwt` is required because the trigger calls the function with the
service role key directly, not a user JWT.

---

## Step 3 — Connect the trigger to the function

This stores your service role key in **Supabase Vault** (their built-in
secret store) and points the trigger at it.

### 3a. Apply migration 009

Open the Supabase SQL Editor and run
[`supabase/migrations/009_push_use_vault.sql`](supabase/migrations/009_push_use_vault.sql).

This enables the Vault extension and rewrites the trigger function to read
the secret from Vault instead of GUC settings.

### 3b. Save your service role key into Vault

Get the key from:
- Settings → API → Project API keys → `service_role` (the secret one — **not**
  the anon key). Click **Reveal** then **Copy**.

> ⚠️ This key bypasses all RLS. Never paste it into your `.env`, app code,
> or commit it. Vault is the right place for it — it's encrypted at rest.

Open a **new SQL Editor tab** and paste this (replace the placeholder with
your actual key), then run:

```sql
do $$
declare
  existing_id uuid;
begin
  select id into existing_id
    from vault.secrets
   where name = 'send_push_service_role_key';

  if existing_id is not null then
    perform vault.update_secret(existing_id, 'PASTE_YOUR_SERVICE_ROLE_KEY_HERE');
  else
    perform vault.create_secret(
      'PASTE_YOUR_SERVICE_ROLE_KEY_HERE',
      'send_push_service_role_key',
      'Service role key for send_push edge function trigger'
    );
  end if;
end$$;
```

Re-running it is safe — it updates the existing secret instead of erroring.

### 3c. Verify

```sql
select name, created_at, updated_at
from vault.secrets
where name = 'send_push_service_role_key';
```

You should see exactly one row.

---

## Step 4 — Set up Firebase / FCM for Android (free)

Push on Android goes through FCM (Firebase Cloud Messaging). Google requires
this even if you use Expo Push — Expo just forwards to FCM behind the scenes.

1. Go to [console.firebase.google.com](https://console.firebase.google.com)
   and create a project. Name it whatever (e.g. "CKR Nutrition OS").
   - **Disable Google Analytics** when prompted (not needed, saves time).
2. In your new project: click the **Android icon** to add an Android app.
3. **Package name:** `com.ckrfitness.nutritionos`  (must match `app.json`)
   App nickname: optional
   SHA-1: skip for now (you can add later if you want Google sign-in)
4. Click **Register app**.
5. Click **Download google-services.json**.
6. Move that file into the **project root** (next to `app.json`).
7. Open `app.json` and add this line inside the `"android"` block:

```json
"android": {
  "package": "com.ckrfitness.nutritionos",
  "adaptiveIcon": { "backgroundColor": "#0A0B0D" },
  "googleServicesFile": "./google-services.json"
}
```

8. Skip the remaining "Add Firebase SDK" pages in the Firebase wizard — Expo
   handles that part during EAS build.

### Upload your FCM key to Expo

Expo's push service needs your FCM credentials to deliver pushes. EAS sets
this up automatically the first time you build, but you need to opt-in to
**FCM v1**:

In Firebase Console → ⚙️ Project Settings → **Service accounts** tab →
**Generate new private key** → download the JSON file (rename it to
`fcm-service-account.json` so you remember what it is).

Then run from your project folder:

```powershell
eas credentials
```

- Select **Android**
- Select **production** profile (you can repeat for development later)
- Select **Google Service Account Key** → **Set up a Google Service Account
  Key for Push Notifications (FCM V1)**
- Point it at `fcm-service-account.json`

> **Do not commit `google-services.json` or `fcm-service-account.json`** to
> git. Add them to `.gitignore`.

---

## Step 5 — Build a development APK

This is the build that replaces Expo Go for testing.

```powershell
npm install -g eas-cli
eas login                          # use your Expo account
eas init                           # adds extra.eas.projectId to app.json
eas build --profile development --platform android
```

Last command takes ~10 minutes on Expo's cloud (free tier). When it finishes,
EAS prints a download link. Open it on your Android phone, install the APK,
and you're done.

Then in your project folder:

```powershell
npx expo start --dev-client
```

Scan the QR code with **your APK** (not Expo Go). The app loads with hot
reload, exactly like Expo Go — but with native push support.

---

## Verifying it works

1. Open the dev-client app on your phone, sign in as a trainer.
   - First time only: the OS will prompt for notification permission. Allow it.
   - Check Metro logs — you should see `[push] token registered: ExponentPushToken[...]`
2. In a different browser tab, open Supabase → Table Editor → `device_push_tokens`.
   - You should see one row with your `user_id` + the token.
3. Sign in as admin on another device (or the same — sign out + back in).
4. From the trainer device, add a new client.
5. Admin device should buzz with a real push notification on the lock screen.
6. Tap the push → app opens → lands on the Notifications inbox.

If you only have one phone for now: testing admin notifications still works.
Sign in as admin, then use a **second browser tab** (Supabase or the web)
running a trainer session — it'll work the same.

---

## Costs (the full picture)

| Item | Cost |
|---|---|
| Firebase (FCM) | Free, unlimited |
| Expo Push Service | Free, unlimited |
| EAS Build (free tier) | 30 Android builds/month — plenty |
| Supabase Edge Function calls | Within free tier (~500K/month) |
| **Total for Android development & testing** | **$0** |
| Google Play Store one-time fee | $25 (only when you publish) |
| iOS (if/when you want it) | $99/year Apple Developer |

---

## Troubleshooting

**The trigger fires but no push arrives:**
1. Check the Edge Function logs:
   `supabase functions logs send_push --follow`
2. Look for `sent: 0, reason: 'no tokens for recipient'` — means the
   recipient hasn't registered a token yet (haven't signed in on the
   dev-client APK, or denied permission).

**`getExpoPushTokenAsync failed`:**
- You're running on Expo Go (push is disabled there — use the dev-client APK)
- Or `extra.eas.projectId` is empty in `app.json` (run `eas init`)

**Build fails: `googleServicesFile not found`:**
- You added the `googleServicesFile` line to `app.json` but the file isn't
  in the project root. Download from Firebase Console and place it next to
  `app.json`.

**Trigger NOTICE: `vault secret "send_push_service_role_key" not set`:**
- Step 3b wasn't run, or it ran with the placeholder text still in place.
  Re-run the `do $$ … end$$` block from 3b with the real service role key,
  then re-test.

**Stale tokens stay around forever:**
- They don't — the Edge Function automatically deletes any token Expo
  reports as `DeviceNotRegistered` (user uninstalled the app, etc.).
