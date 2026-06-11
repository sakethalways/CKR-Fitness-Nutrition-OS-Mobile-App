/**
 * Centralised, production-safe error messaging.
 *
 * NEVER show a raw Supabase / Postgres / network error to a user — strings like
 * `relation "clients" does not exist`, `duplicate key value violates ...`, or a
 * red-box stack trace are confusing and leak internals. Everything the user sees
 * goes through `friendlyError()`, which maps known technical signatures to plain
 * language and falls back to a generic message for anything unrecognised.
 *
 * When WE author a message that's already user-friendly (e.g. validation copy or
 * the auth flows), throw an `AppError` — `friendlyError()` passes those through
 * verbatim instead of mapping them.
 */

export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AppError";
  }
}

// Postgres SQLSTATE codes Supabase surfaces in `error.code`.
const POSTGRES: Record<string, string> = {
  "23505": "This already exists.",
  "23503": "This is still linked to other records, so it can't be removed yet.",
  "23502": "Some required information is missing.",
  "23514": "Some of the values entered aren't allowed.",
  "22P02": "Some of the values entered aren't in the right format.",
  "42501": "You don't have permission to do that.",
  // PostgREST codes
  PGRST116: "That item no longer exists — it may have just been removed.",
  PGRST301: "Your session expired. Please sign in again."
};

const NETWORK = "Couldn't connect. Check your internet and try again.";
const SESSION = "Your session expired. Please sign in again.";
const DEFAULT = "Something went wrong. Please try again.";

/**
 * Turn any thrown value into a short, friendly, user-safe sentence.
 * Guarantees no raw technical text reaches the UI.
 */
export function friendlyError(e: unknown, fallback: string = DEFAULT): string {
  // Messages we authored ourselves are already safe to show.
  if (e instanceof AppError) return e.message;

  const anyE = e as
    | { message?: unknown; code?: unknown; name?: unknown; status?: unknown }
    | null
    | undefined;

  const code = anyE?.code != null ? String(anyE.code) : undefined;
  const status = anyE?.status != null ? String(anyE.status) : undefined;
  const name = typeof anyE?.name === "string" ? anyE.name : "";
  const raw = anyE?.message != null ? String(anyE.message) : "";
  const lower = raw.toLowerCase();

  // --- Connectivity ---
  if (
    name === "AbortError" ||
    lower.includes("network request failed") ||
    lower.includes("failed to fetch") ||
    lower.includes("fetch failed") ||
    lower.includes("network error") ||
    lower.includes("couldn't reach") ||
    lower.includes("timed out") ||
    lower.includes("timeout")
  ) {
    return NETWORK;
  }

  // --- Auth / session ---
  if (
    lower.includes("invalid login") ||
    lower.includes("invalid credentials") ||
    lower.includes("invalid email or password")
  ) {
    return "Incorrect login details. Please try again.";
  }
  if (
    code === "PGRST301" ||
    lower.includes("jwt") ||
    lower.includes("not authenticated") ||
    lower.includes("auth session missing") ||
    lower.includes("session expired") ||
    lower.includes("token is expired")
  ) {
    return SESSION;
  }
  if (status === "429" || lower.includes("rate limit") || lower.includes("too many")) {
    return "Too many attempts. Please wait a moment and try again.";
  }

  // --- Known Postgres / PostgREST codes ---
  if (code && POSTGRES[code]) return POSTGRES[code];

  // --- Textual permission / RLS / duplicate fallbacks (no code present) ---
  if (
    lower.includes("permission denied") ||
    lower.includes("row-level security") ||
    lower.includes("violates row-level") ||
    lower.includes("not allowed")
  ) {
    return "You don't have permission to do that.";
  }
  if (lower.includes("duplicate key") || lower.includes("already exists")) {
    return POSTGRES["23505"];
  }
  if (lower.includes("no rows") || lower.includes("0 rows")) {
    return POSTGRES.PGRST116;
  }

  // Unknown — never leak the raw message.
  return fallback;
}
