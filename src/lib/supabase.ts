import "react-native-url-polyfill/auto";
import { createClient, SupabaseClient } from "@supabase/supabase-js";
import AsyncStorage from "@react-native-async-storage/async-storage";

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? "";

export let supabaseInitError: string | null = null;

// ===========================================================================
// Instrumented fetch — logs every Supabase HTTP call + hard-aborts at 15s.
// Without this, supabase-js calls can silently hang forever on RN if the
// device's network can't reach *.supabase.co for any reason.
// ===========================================================================
const FETCH_TIMEOUT_MS = 15000;

// Per-request logging is dev-only — in release it would run on every network
// call on the user's device (pure overhead + noise). The 15s hard-abort stays
// in all builds so a flaky network can never hang a request forever.
const DEV = typeof __DEV__ !== "undefined" && __DEV__;

const loggedFetch: typeof fetch = (input, init) => {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
      ? input.toString()
      : (input as Request).url;
  const method = init?.method ?? "GET";
  const start = Date.now();
  if (DEV) {
    // eslint-disable-next-line no-console
    console.log(`[fetch →] ${method} ${url}`);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => {
    if (DEV) {
      // eslint-disable-next-line no-console
      console.warn(`[fetch ⏱] aborting after ${FETCH_TIMEOUT_MS}ms: ${url}`);
    }
    controller.abort();
  }, FETCH_TIMEOUT_MS);

  // Merge our signal with any incoming signal
  const signal = init?.signal ?? controller.signal;
  return fetch(input as any, { ...init, signal })
    .then(async (res) => {
      clearTimeout(timer);
      if (DEV) {
        if (res.ok) {
          // eslint-disable-next-line no-console
          console.log(`[fetch ←] ${res.status} ${url} (${Date.now() - start}ms)`);
        } else {
          // Read body so we see the EXACT Postgres / Supabase error
          let body = "";
          try {
            body = await res.clone().text();
          } catch {
            /* silent */
          }
          // eslint-disable-next-line no-console
          console.error(
            `[fetch ✗] ${res.status} ${url} (${Date.now() - start}ms)\n  body: ${body.slice(0, 600)}`
          );
        }
      }
      return res;
    })
    .catch((e) => {
      clearTimeout(timer);
      if (DEV) {
        // eslint-disable-next-line no-console
        console.error(
          `[fetch ✗] ${url} (${Date.now() - start}ms) ${e?.message ?? e}`
        );
      }
      throw e;
    });
};

const PLACEHOLDER_URL = "https://placeholder.invalid";
const PLACEHOLDER_KEY = "placeholder";

const tryCreate = (): SupabaseClient => {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    supabaseInitError =
      "Supabase env vars are missing.\n\n" +
      "1) Make sure .env at the project root has:\n" +
      "   EXPO_PUBLIC_SUPABASE_URL=https://....supabase.co\n" +
      "   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...\n\n" +
      "2) Stop Expo (Ctrl+C) and start with:\n" +
      "   npx expo start --clear";
    // eslint-disable-next-line no-console
    console.error("[supabase]", supabaseInitError);
    return createClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }
  try {
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        storage: AsyncStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false
      },
      global: {
        fetch: loggedFetch
      },
      realtime: {
        // Don't auto-connect realtime until a channel actually subscribes
        params: { eventsPerSecond: 10 }
      }
    });
  } catch (e: any) {
    supabaseInitError = `Failed to create Supabase client: ${e?.message ?? e}`;
    // eslint-disable-next-line no-console
    console.error("[supabase]", supabaseInitError);
    return createClient(PLACEHOLDER_URL, PLACEHOLDER_KEY);
  }
};

// eslint-disable-next-line no-console
console.log("[supabase] init →", {
  hasUrl: Boolean(SUPABASE_URL),
  hasKey: Boolean(SUPABASE_ANON_KEY),
  url: SUPABASE_URL || "(missing)"
});

export const supabase = tryCreate();

// ===========================================================================
// Manual reachability check — call this once on startup to confirm whether
// the device can even reach *.supabase.co before we trust supabase-js.
// ===========================================================================
export const pingSupabase = async (): Promise<{ ok: boolean; ms: number; status?: number; error?: string }> => {
  const start = Date.now();
  try {
    const res = await loggedFetch(`${SUPABASE_URL}/auth/v1/health`, {
      method: "GET",
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    return { ok: res.ok, ms: Date.now() - start, status: res.status };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - start, error: e?.message ?? String(e) };
  }
};

// ===== Email <-> mobile mapping =====
export const ADMIN_EMAIL = "chandrakiranreddygaddam@gmail.com";
export const trainerEmail = (mobile: string) =>
  `tr_${mobile.replace(/\D/g, "")}@ckr.app`;

export const roleFromSession = (
  session: import("@supabase/supabase-js").Session | null
): "admin" | "trainer" | null => {
  if (!session) return null;
  const role = (session.user.app_metadata as any)?.role;
  if (role === "admin") return "admin";
  if (role === "trainer") return "trainer";
  return null;
};
