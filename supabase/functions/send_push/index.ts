// Edge Function: send_push
//
// Called by the AFTER INSERT trigger on public.notifications.
// Looks up every device_push_token row for the recipient and sends the
// notification through Expo's push service. Stale "DeviceNotRegistered"
// tokens are deleted so they don't keep generating noise.
//
// Request:
//   POST /functions/v1/send_push
//   Authorization: Bearer <service_role_key>          ← from the trigger
//   Body: {
//     id, recipient_role, recipient_id, kind, title, body, payload
//   }
//
// Returns 200 { sent, cleaned } or 4xx/5xx { error }.

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders, jsonResponse } from "../_shared/cors.ts";

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

interface NotifPayload {
  id: string;
  recipient_role: "admin" | "trainer";
  recipient_id: string;
  kind: string;
  title: string;
  body: string;
  payload: Record<string, unknown>;
}

interface ExpoMessage {
  to: string;
  sound: "default";
  title: string;
  body: string;
  priority: "high";
  channelId: "default";
  data: Record<string, unknown>;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") return jsonResponse(405, { error: "POST only" });

  try {
    const notif = (await req.json()) as NotifPayload;
    if (!notif?.recipient_id) {
      return jsonResponse(400, { error: "missing recipient_id" });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
      auth: { persistSession: false, autoRefreshToken: false }
    });

    // 1. Look up every device token belonging to the recipient.
    const { data: tokens, error: tokenErr } = await admin
      .from("device_push_tokens")
      .select("token")
      .eq("user_id", notif.recipient_id);

    if (tokenErr) {
      console.error("token lookup error", tokenErr);
      return jsonResponse(500, { error: tokenErr.message });
    }
    if (!tokens || tokens.length === 0) {
      return jsonResponse(200, { sent: 0, reason: "no tokens for recipient" });
    }

    // 2. Build Expo message objects.
    const messages: ExpoMessage[] = tokens.map((t) => ({
      to: t.token as string,
      sound: "default",
      title: notif.title,
      body: notif.body,
      priority: "high",
      channelId: "default",
      data: {
        notificationId: notif.id,
        kind: notif.kind,
        recipientRole: notif.recipient_role,
        ...(notif.payload ?? {})
      }
    }));

    // 3. POST to Expo in chunks of 100 (Expo's hard limit).
    const chunks: ExpoMessage[][] = [];
    for (let i = 0; i < messages.length; i += 100) {
      chunks.push(messages.slice(i, i + 100));
    }

    const invalidTokens: string[] = [];

    for (const chunk of chunks) {
      const resp = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          "Accept-Encoding": "gzip, deflate"
        },
        body: JSON.stringify(chunk)
      });

      if (!resp.ok) {
        const text = await resp.text();
        console.error("expo push HTTP error", resp.status, text);
        continue;
      }

      const respBody = (await resp.json()) as { data?: unknown[] };
      const tickets = Array.isArray(respBody?.data) ? respBody.data : [];
      tickets.forEach((ticket: unknown, idx: number) => {
        const t = ticket as {
          status?: string;
          details?: { error?: string };
        };
        if (
          t?.status === "error" &&
          t?.details?.error === "DeviceNotRegistered"
        ) {
          invalidTokens.push(chunk[idx].to);
        }
      });
    }

    // 4. Best-effort cleanup of stale tokens.
    if (invalidTokens.length > 0) {
      const { error: delErr } = await admin
        .from("device_push_tokens")
        .delete()
        .in("token", invalidTokens);
      if (delErr) {
        console.warn("stale token cleanup failed", delErr);
      }
    }

    return jsonResponse(200, {
      sent: messages.length,
      cleaned: invalidTokens.length
    });
  } catch (e) {
    console.error("send_push fatal", e);
    return jsonResponse(500, { error: String(e) });
  }
});
