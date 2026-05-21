// Edge Function: update_trainer_password
// Admin-only. Sets a new password on a trainer's auth user.
//
// Request:
//   POST /functions/v1/update_trainer_password
//   Authorization: Bearer <admin JWT>
//   Body: { id: <trainer uuid>, password: <new password (>=4 chars)> }

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse(405, { error: "POST only" });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonResponse(401, { error: "Missing Authorization header" });

    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) return jsonResponse(401, { error: "Not authenticated" });
    if ((user.app_metadata as any)?.role !== "admin") {
      return jsonResponse(403, { error: "Admin only" });
    }

    const { id, password } = (await req.json()) as { id: string; password: string };
    if (!id) return jsonResponse(400, { error: "id required" });
    if (!password || password.length < 4)
      return jsonResponse(400, { error: "password must be at least 4 characters" });

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const { error } = await admin.auth.admin.updateUserById(id, { password });
    if (error) return jsonResponse(500, { error: error.message });

    return jsonResponse(200, { ok: true });
  } catch (e) {
    return jsonResponse(500, { error: String(e) });
  }
});
