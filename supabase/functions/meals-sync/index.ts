// Edge Function: meals-sync
// ---------------------------------------------------------------------------
// Server side of the two-way Google Sheet <-> meals table sync.
//
// Called ONLY by the Google Apps Script bound to the meals spreadsheet.
// Authentication is a shared secret (header `x-sync-secret`) compared to the
// SHEET_SYNC_SECRET env var — NOT a user JWT, because the script is not a user.
// All DB access uses the service role (bypasses the admin-only RLS on meals),
// which is safe because the secret gates every request.
//
// Actions (POST body { action: ... }):
//   { action: "export" }
//       -> { meals: [...all rows...], deletions: [{id, deleted_at}, ...] }
//   { action: "mutate", upserts: [...], inserts: [...], deletes: [ids],
//     clearTombstones: [ids] }
//       -> { ok: true, inserted: [...rows in same order as `inserts`] }
//
// `upserts` = existing rows (have id) whose values changed.
// `inserts` = brand-new rows from the sheet (no id); SERIAL assigns one and we
//             echo the inserted rows back IN ORDER so the script can write the
//             new ids into the sheet.
// `deletes` = meal ids removed from the sheet -> delete from DB.
// `clearTombstones` = meal_deletions ids the script has finished processing.
// ---------------------------------------------------------------------------

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SHEET_SYNC_SECRET = Deno.env.get("SHEET_SYNC_SECRET")!;

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-sync-secret, authorization, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS"
};

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" }
  });

// Whitelist of columns the sheet is allowed to write. updated_at/created_at are
// DB-managed; id is set only for upserts (never overwritten on insert).
const WRITABLE = [
  "meal_code",
  "meal_number",
  "meal_name",
  "meal_type",
  "diet",
  "cal_bracket",
  "quantities",
  "calories",
  "protein_g",
  "carbs_g",
  "fat_g",
  "client_tags",
  "allergens",
  "notes",
  "rating",
  "base_description",
  "protein_anchor",
  "meal_section",
  "reel_url"
];

function clean(row: Record<string, unknown>, keepId: boolean) {
  const out: Record<string, unknown> = {};
  if (keepId && row.id != null && row.id !== "") out.id = Number(row.id);
  for (const k of WRITABLE) {
    if (k in row) out[k] = row[k];
  }
  // Arrays must stay arrays for text[] columns.
  for (const k of ["client_tags", "allergens"]) {
    if (out[k] != null && !Array.isArray(out[k])) out[k] = [];
  }
  return out;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json(405, { error: "POST only" });

  if (req.headers.get("x-sync-secret") !== SHEET_SYNC_SECRET) {
    return json(401, { error: "Bad sync secret" });
  }

  const db = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

  try {
    const body = (await req.json()) as Record<string, any>;
    const action = body.action;

    if (action === "export") {
      const { data: meals, error: mErr } = await db
        .from("meals")
        .select("*")
        .order("meal_number")
        .order("cal_bracket");
      if (mErr) return json(500, { error: mErr.message });

      const { data: deletions, error: dErr } = await db
        .from("meal_deletions")
        .select("id, meal_code, deleted_at");
      if (dErr) return json(500, { error: dErr.message });

      return json(200, { meals: meals ?? [], deletions: deletions ?? [] });
    }

    if (action === "mutate") {
      const upserts = Array.isArray(body.upserts) ? body.upserts : [];
      const inserts = Array.isArray(body.inserts) ? body.inserts : [];
      const deletes = Array.isArray(body.deletes) ? body.deletes : [];
      const clearTombstones = Array.isArray(body.clearTombstones)
        ? body.clearTombstones
        : [];

      // 1) Upsert existing rows (id preserved).
      if (upserts.length > 0) {
        const rows = upserts.map((r: any) => clean(r, true));
        const { error } = await db.from("meals").upsert(rows, { onConflict: "id" });
        if (error) return json(500, { error: `upsert: ${error.message}` });
      }

      // 2) Insert brand-new rows; return them IN ORDER so the script can write
      //    the assigned ids back into the sheet.
      let inserted: any[] = [];
      if (inserts.length > 0) {
        const rows = inserts.map((r: any) => clean(r, false));
        const { data, error } = await db.from("meals").insert(rows).select();
        if (error) return json(500, { error: `insert: ${error.message}` });
        inserted = data ?? [];
      }

      // 3) Delete rows removed from the sheet.
      if (deletes.length > 0) {
        const ids = deletes.map((x: any) => Number(x)).filter((n: number) => !Number.isNaN(n));
        if (ids.length > 0) {
          const { error } = await db.from("meals").delete().in("id", ids);
          if (error) return json(500, { error: `delete: ${error.message}` });
        }
      }

      // 4) Clear processed tombstones (app-side deletes already mirrored, plus
      //    the sheet-side deletes we just made — so neither replays next cycle).
      const tomb = [...clearTombstones, ...deletes]
        .map((x: any) => Number(x))
        .filter((n: number) => !Number.isNaN(n));
      if (tomb.length > 0) {
        const { error } = await db.from("meal_deletions").delete().in("id", tomb);
        if (error) return json(500, { error: `clearTombstones: ${error.message}` });
      }

      return json(200, { ok: true, inserted });
    }

    return json(400, { error: "Unknown action" });
  } catch (e) {
    return json(500, { error: String(e) });
  }
});
