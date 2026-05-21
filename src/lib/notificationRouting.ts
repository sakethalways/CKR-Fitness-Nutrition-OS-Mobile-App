import type { Notification } from "@/data/types";

/**
 * Shared route resolver used by both:
 *   • the in-app notifications inbox (tap a row)
 *   • the OS push notification handler (tap a banner)
 *
 * Behavior matches the inbox's original logic so a tap on the banner lands
 * on the SAME screen as a tap on the inbox row would.
 *
 * Returns null when there is no kind-specific screen — caller falls back to
 * the notifications inbox.
 */
export const routeForNotificationData = (data: {
  kind?: string;
  planId?: string;
  clientId?: string;
}): string | null => {
  const { kind, planId, clientId } = data;
  const goPlan =
    (kind === "plan_change_request" ||
      kind === "new_rating" ||
      kind === "admin_changed_plan") &&
    !!planId;
  if (goPlan) return `/(app)/plan-detail?planId=${planId}`;
  if (clientId) return `/(app)/client/${clientId}`;
  return null;
};

/** Convenience wrapper for the in-app Notification model. */
export const routeForNotification = (n: Notification): string | null =>
  routeForNotificationData({
    kind: n.kind,
    planId: (n.payload as any)?.planId,
    clientId: (n.payload as any)?.clientId
  });

/**
 * Parse the data blob from a push notification tap into the shape
 * `routeForNotificationData` expects. The Edge Function flattens
 * `notif.payload` into `data`, so planId/clientId may live at the top level.
 */
export const routeFromPushData = (
  data: Record<string, any>
): string | null =>
  routeForNotificationData({
    kind: data.kind,
    planId: data.planId,
    clientId: data.clientId
  });

export const FALLBACK_NOTIFICATIONS_ROUTE = "/(app)/(tabs)/notifications";
