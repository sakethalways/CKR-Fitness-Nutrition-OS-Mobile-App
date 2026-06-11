import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { Notification, NotificationKind, Role } from "@/data/types";

const notifFromRow = (r: any): Notification => ({
  id: r.id,
  recipientRole: r.recipient_role as Role,
  recipientId: r.recipient_id,
  kind: r.kind as NotificationKind,
  title: r.title,
  body: r.body,
  payload: r.payload ?? {},
  isRead: r.is_read,
  createdAt: r.created_at
});

const notifToDb = (n: Partial<Notification>) => {
  const out: any = {};
  if (n.recipientRole !== undefined) out.recipient_role = n.recipientRole;
  if (n.recipientId !== undefined) out.recipient_id = n.recipientId;
  if (n.kind !== undefined) out.kind = n.kind;
  if (n.title !== undefined) out.title = n.title;
  if (n.body !== undefined) out.body = n.body;
  if (n.payload !== undefined) out.payload = n.payload;
  if (n.isRead !== undefined) out.is_read = n.isRead;
  return out;
};

type NotificationsState = {
  items: Notification[];
  hasHydrated: boolean;
  init: (recipientRole: Role, recipientId: string) => Promise<void>;
  dispose: () => void;
  push: (n: Omit<Notification, "id" | "createdAt" | "isRead">) => Promise<Notification>;
  /**
   * Same as push() but never throws. Use this from action handlers (save
   * plan, mark closed, etc.) so a flaky notification can never block the
   * real action. Errors are logged but not propagated.
   */
  safePush: (n: Omit<Notification, "id" | "createdAt" | "isRead">) => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: (recipientRole: Role, recipientId: string) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clearForUser: (recipientRole: Role, recipientId: string) => Promise<void>;
  update: (id: string, patch: Partial<Notification>) => Promise<void>;
  /** Update that swallows errors (companion to safePush). */
  safeUpdate: (id: string, patch: Partial<Notification>) => Promise<void>;
};

let activeChannel: { unsubscribe: () => void } | null = null;

export const useNotifications = create<NotificationsState>((set, get) => ({
  items: [],
  hasHydrated: false,

  init: async (recipientRole, recipientId) => {
    try {
      // Scope the fetch to this recipient explicitly (matches the realtime
      // filter below). RLS already enforces this, but filtering at the query
      // keeps the payload small and is a second layer of defence.
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("recipient_id", recipientId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      set({ items: (data ?? []).map(notifFromRow), hasHydrated: true });
    } catch (e) {
      set({ items: [], hasHydrated: true });
      // eslint-disable-next-line no-console
      console.warn("[notifs] init failed", e);
    }

    // Per-user real-time subscription. RLS already filters reads, but a
    // filter narrows down the push volume too.
    // Use removeChannel (not just unsubscribe) and a unique channel name per
    // init so we never trip "callbacks added after subscribe()".
    if (activeChannel) {
      try {
        await supabase.removeChannel(activeChannel);
      } catch {
        /* ignore */
      }
      activeChannel = null;
    }
    const channelName = `rt-notifs-${recipientId}-${Date.now()}`;
    const ch = supabase.channel(channelName);
    ch.on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "notifications",
        filter: `recipient_id=eq.${recipientId}`
      },
      (payload) => {
        const evt = payload.eventType;
        if (evt === "DELETE") {
          const oldId = payload.old?.id;
          if (!oldId) return;
          set((s) => ({ items: s.items.filter((n) => n.id !== oldId) }));
          return;
        }
        const next = notifFromRow(payload.new);
        set((s) => {
          const idx = s.items.findIndex((n) => n.id === next.id);
          if (idx === -1) return { items: [next, ...s.items] };
          const copy = s.items.slice();
          copy[idx] = next;
          return { items: copy };
        });
      }
    );
    ch.subscribe();
    activeChannel = ch;
  },

  dispose: () => {
    if (activeChannel) {
      const ch = activeChannel;
      activeChannel = null;
      supabase.removeChannel(ch).catch(() => {});
    }
    set({ items: [], hasHydrated: false });
  },

  push: async (n) => {
    const { data, error } = await supabase
      .from("notifications")
      .insert(notifToDb({ ...n, isRead: false }))
      .select()
      .single();
    if (error) throw error;
    const created = notifFromRow(data);
    set((s) => ({ items: [created, ...s.items.filter((x) => x.id !== created.id)] }));
    return created;
  },

  safePush: async (n) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert(notifToDb({ ...n, isRead: false }))
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const created = notifFromRow(data);
        set((s) => ({
          items: [created, ...s.items.filter((x) => x.id !== created.id)]
        }));
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn(
        `[notif] safePush suppressed: ${e?.message ?? e}`,
        { recipientRole: n.recipientRole, kind: n.kind }
      );
    }
  },

  markRead: async (id) => {
    const { data, error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("id", id)
      .select()
      .single();
    if (error) return;
    if (data) {
      const next = notifFromRow(data);
      set((s) => ({
        items: s.items.map((n) => (n.id === id ? next : n))
      }));
    }
  },

  markAllRead: async (recipientRole, recipientId) => {
    const { error } = await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("recipient_role", recipientRole)
      .eq("recipient_id", recipientId)
      .eq("is_read", false);
    if (error) return;
    set((s) => ({
      items: s.items.map((n) =>
        n.recipientRole === recipientRole && n.recipientId === recipientId
          ? { ...n, isRead: true }
          : n
      )
    }));
  },

  remove: async (id) => {
    const { error } = await supabase.from("notifications").delete().eq("id", id);
    if (error) return;
    set((s) => ({ items: s.items.filter((n) => n.id !== id) }));
  },

  clearForUser: async (recipientRole, recipientId) => {
    const { error } = await supabase
      .from("notifications")
      .delete()
      .eq("recipient_role", recipientRole)
      .eq("recipient_id", recipientId);
    if (error) return;
    set((s) => ({
      items: s.items.filter(
        (n) =>
          !(n.recipientRole === recipientRole && n.recipientId === recipientId)
      )
    }));
  },

  update: async (id, patch) => {
    const { data, error } = await supabase
      .from("notifications")
      .update(notifToDb(patch))
      .eq("id", id)
      .select()
      .single();
    if (error) return;
    if (data) {
      const next = notifFromRow(data);
      set((s) => ({
        items: s.items.map((n) => (n.id === id ? next : n))
      }));
    }
  },

  safeUpdate: async (id, patch) => {
    try {
      const { data, error } = await supabase
        .from("notifications")
        .update(notifToDb(patch))
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      if (data) {
        const next = notifFromRow(data);
        set((s) => ({
          items: s.items.map((n) => (n.id === id ? next : n))
        }));
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn(`[notif] safeUpdate suppressed: ${e?.message ?? e}`);
    }
  }
}));

// Friendly label per notification kind
export const kindLabel = (k: NotificationKind): string => {
  switch (k) {
    case "new_client":
      return "New client";
    case "new_rating":
      return "New rating";
    case "client_critical":
      return "Critical tag";
    case "deletion_request":
      return "Delete request";
    case "plan_change_request":
      return "Plan change request";
    case "admin_changed_plan":
      return "Plan updated by admin";
    case "deletion_approved":
      return "Deletion approved";
  }
};
