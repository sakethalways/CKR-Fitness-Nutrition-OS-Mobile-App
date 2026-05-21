import { create } from "zustand";
import { Admin, Role, Trainer } from "@/data/types";
import { supabase, trainerEmail, ADMIN_EMAIL, roleFromSession } from "@/lib/supabase";
import { registerPushTokenForUser, unregisterPushTokenAsync } from "@/lib/push";

export type AuthUser =
  | { role: "trainer"; trainer: Trainer }
  | { role: "admin"; admin: Admin };

type AuthState = {
  user: AuthUser | null;
  hasHydrated: boolean;
  initializing: boolean;
  setUser: (u: AuthUser | null) => void;
  init: () => Promise<void>;
  signInTrainer: (mobile: string, password: string) => Promise<Trainer>;
  signInAdmin: (password: string) => Promise<Admin>;
  signOut: () => Promise<void>;
};

const withTimeout = <T>(p: Promise<T>, ms: number, msg: string): Promise<T> =>
  Promise.race<T>([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(msg)), ms)
    )
  ]);

const initialsOf = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

const trainerFromRow = (row: any): Trainer => ({
  id: row.id,
  name: row.name,
  mobile: row.mobile,
  age: row.age,
  gender: row.gender,
  password: "",
  isActive: row.is_active,
  createdAt: row.created_at,
  initials: initialsOf(row.name),
  avatarUri: row.avatar_url ?? undefined
});

const adminFromRow = (row: any): Admin => ({
  id: row.id,
  name: row.name,
  initials: initialsOf(row.name)
});

/**
 * Build a minimal AuthUser from the JWT alone — no DB query needed. Used as
 * the immediate result of sign-in (so login completes instantly) and as a
 * fallback when AsyncStorage / network are flaky.
 */
const userFromSession = (
  session: import("@supabase/supabase-js").Session,
  mobileHint?: string
): AuthUser | null => {
  const role = roleFromSession(session);
  if (role === "admin") {
    const name = (session.user.user_metadata as any)?.name ?? "CKR Admin";
    return {
      role: "admin",
      admin: { id: session.user.id, name, initials: initialsOf(name) }
    };
  }
  if (role === "trainer") {
    const meta = (session.user.user_metadata as any) ?? {};
    const name = meta.name ?? "Trainer";
    const mobile = mobileHint ?? meta.mobile ?? "";
    return {
      role: "trainer",
      trainer: {
        id: session.user.id,
        name,
        mobile,
        age: meta.age ?? 0,
        gender: meta.gender ?? "Other",
        password: "",
        isActive: true,
        createdAt: session.user.created_at,
        initials: initialsOf(name)
      }
    };
  }
  return null;
};

/**
 * Best-effort: enrich a user with the full DB profile. Runs in the
 * background after sign-in — login already completed with the minimal user.
 * Failures are logged but don't break anything.
 */
const enrichUserFromDb = async (current: AuthUser): Promise<void> => {
  try {
    if (current.role === "admin") {
      const { data } = await supabase
        .from("admins")
        .select("*")
        .eq("id", current.admin.id)
        .single();
      if (data) {
        useAuth.getState().setUser({ role: "admin", admin: adminFromRow(data) });
      }
    } else {
      const { data } = await supabase
        .from("trainers")
        .select("*")
        .eq("id", current.trainer.id)
        .single();
      if (data) {
        if (!data.is_active) {
          await supabase.auth.signOut();
          useAuth.getState().setUser(null);
          return;
        }
        useAuth
          .getState()
          .setUser({ role: "trainer", trainer: trainerFromRow(data) });
      }
    }
  } catch (e) {
    // eslint-disable-next-line no-console
    console.warn("[auth] enrich from DB failed (non-fatal)", e);
  }
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  hasHydrated: false,
  initializing: false,
  setUser: (u) => set({ user: u }),

  init: async () => {
    if (get().initializing) {
      // eslint-disable-next-line no-console
      console.log("[auth] init skip — already initializing");
      return;
    }
    // eslint-disable-next-line no-console
    console.log("[auth] init step 1 — entering");
    set({ initializing: true });
    try {
      // eslint-disable-next-line no-console
      console.log("[auth] init step 2 — calling getSession()");
      const sessionPromise = supabase.auth.getSession();
      const { data } = (await Promise.race([
        sessionPromise,
        new Promise<{ data: { session: null } }>((resolve) =>
          setTimeout(() => {
            // eslint-disable-next-line no-console
            console.warn(
              "[auth] init — getSession timed out after 4s, treating as signed-out"
            );
            resolve({ data: { session: null } });
          }, 4000)
        )
      ])) as { data: { session: import("@supabase/supabase-js").Session | null } };

      // eslint-disable-next-line no-console
      console.log("[auth] init step 3 — got session", {
        hasSession: !!data.session
      });

      if (data.session) {
        const u = userFromSession(data.session);
        // eslint-disable-next-line no-console
        console.log("[auth] init step 4 — built user from JWT", { role: u?.role });
        set({ user: u });
        if (u) {
          enrichUserFromDb(u); // background — non-blocking
          // Re-register push token on cold start so last_seen_at stays fresh
          // and tokens that rolled get updated.
          registerPushTokenForUser(data.session.user.id).catch(() => {});
        }
      } else {
        set({ user: null });
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[auth] init — top-level error", e);
      set({ user: null });
    } finally {
      // eslint-disable-next-line no-console
      console.log("[auth] init step 5 — finally, marking hydrated");
      set({ hasHydrated: true, initializing: false });
    }
  },

  signInTrainer: async (mobile, password) => {
    const m = mobile.replace(/\D/g, "");
    if (m.length !== 10) throw new Error("Enter a valid 10-digit mobile number");
    // eslint-disable-next-line no-console
    console.log("[auth] signInTrainer start");
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: trainerEmail(m),
        password
      }),
      12000,
      "Couldn't reach Supabase — check your phone's internet."
    );
    // eslint-disable-next-line no-console
    console.log("[auth] signInTrainer got response", {
      error: error?.message,
      hasSession: !!data?.session
    });
    if (error) {
      throw new Error(
        error.message.toLowerCase().includes("invalid")
          ? "Incorrect mobile or password"
          : error.message
      );
    }
    if (!data.session) throw new Error("Sign-in failed");
    const u = userFromSession(data.session, m);
    if (!u || u.role !== "trainer") throw new Error("This account is not a trainer");
    // eslint-disable-next-line no-console
    console.log("[auth] signInTrainer built user from JWT — setting");
    set({ user: u });
    enrichUserFromDb(u); // background — non-blocking
    registerPushTokenForUser(u.trainer.id).catch(() => {}); // background
    return u.trainer;
  },

  signInAdmin: async (password) => {
    // eslint-disable-next-line no-console
    console.log("[auth] signInAdmin start");
    const { data, error } = await withTimeout(
      supabase.auth.signInWithPassword({
        email: ADMIN_EMAIL,
        password
      }),
      12000,
      "Couldn't reach Supabase — check your phone's internet."
    );
    // eslint-disable-next-line no-console
    console.log("[auth] signInAdmin got response", {
      error: error?.message,
      hasSession: !!data?.session
    });
    if (error) {
      throw new Error(
        error.message.toLowerCase().includes("invalid")
          ? "Incorrect admin password"
          : error.message
      );
    }
    if (!data.session) throw new Error("Sign-in failed");
    const u = userFromSession(data.session);
    if (!u || u.role !== "admin") throw new Error("This account is not admin");
    // eslint-disable-next-line no-console
    console.log("[auth] signInAdmin built user from JWT — setting");
    set({ user: u });
    enrichUserFromDb(u); // background — non-blocking
    registerPushTokenForUser(u.admin.id).catch(() => {}); // background
    return u.admin;
  },

  signOut: async () => {
    // Unregister push first so the row is removed using the still-valid
    // session. After auth.signOut, RLS would reject the delete.
    await unregisterPushTokenAsync().catch(() => {});
    await supabase.auth.signOut().catch(() => {});
    set({ user: null });
  }
}));

// NOTE: no top-level onAuthStateChange listener — it was racing with explicit
// sign-in flows and causing duplicate work. The store's signIn methods handle
// auth state transitions directly.
