// Edge Function: create_trainer
// Admin-only. Creates an auth user + matching public.trainers row in one shot.
//
// Request:
//   POST /functions/v1/create_trainer
//   Authorization: Bearer <caller's user JWT>     ← must be admin
//   Body: { name, mobile, age, gender, password }
//
// Returns 200 { id: <new trainer uuid> } or 4xx { error }.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

type Body = {
  name: string;
  mobile: string;
  age: number;
  gender: "M" | "F" | "Other";
  password: string;
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return jsonResponse(405, { error: "POST only" });

  try {
    // 1. Verify caller is admin
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

    // 2. Parse + validate body
    const body = (await req.json()) as Body;
    if (!body?.name || body.name.trim().length < 2)
      return jsonResponse(400, { error: "name must be at least 2 characters" });
    const mobile = String(body.mobile ?? "").replace(/\D/g, "");
    if (mobile.length !== 10)
      return jsonResponse(400, { error: "mobile must be 10 digits" });
    if (!Number.isFinite(body.age) || body.age < 12 || body.age > 100)
      return jsonResponse(400, { error: "age out of range" });
    if (!["M", "F", "Other"].includes(body.gender))
      return jsonResponse(400, { error: "invalid gender" });
    if (!body.password || body.password.length < 4)
      return jsonResponse(400, { error: "password must be at least 4 characters" });

    // 3. Use service role to create the auth user
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
    const email = `tr_${mobile}@ckr.app`;

    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password: body.password,
      email_confirm: true,
      app_metadata: { role: "trainer" },
      user_metadata: { name: body.name.trim(), mobile }
    });
    if (createError || !created.user) {
      return jsonResponse(400, { error: createError?.message ?? "Could not create user" });
    }

    // 4. Insert public.trainers row
    const { error: insertError } = await admin.from("trainers").insert({
      id: created.user.id,
      name: body.name.trim(),
      mobile,
      age: body.age,
      gender: body.gender,
      is_active: true
    });
    if (insertError) {
      // Roll back the auth user so they aren't left orphaned
      await admin.auth.admin.deleteUser(created.user.id);
      return jsonResponse(500, { error: insertError.message });
    }

    return jsonResponse(200, { id: created.user.id });
  } catch (e) {
    return jsonResponse(500, { error: String(e) });
  }
});
