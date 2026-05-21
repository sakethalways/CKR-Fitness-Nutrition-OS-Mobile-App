import Constants from "expo-constants";
import { Platform } from "react-native";
import type { Notification as InAppNotification } from "@/data/types";
import { supabase } from "@/lib/supabase";

// expo-notifications logs a noisy "removed from Expo Go" warning the moment
// its native module loads. To avoid it, NEVER import the module in Expo Go.
// Lazy-load via require() only when we're in a real (EAS) build.
const isExpoGo = Constants.appOwnership === "expo";

let Notifications: any = null;
let initAttempted = false;
let cachedToken: string | null = null;

const ensureNotifications = (): any => {
  if (isExpoGo) return null;
  if (initAttempted) return Notifications;
  initAttempted = true;
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    Notifications = require("expo-notifications");
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: true
      })
    });
  } catch {
    Notifications = null;
  }
  return Notifications;
};

const resolveProjectId = (): string | undefined => {
  // Set by `eas init` into app.json → extra.eas.projectId,
  // or by EAS CLI into Constants.easConfig at build time.
  const fromExpoConfig =
    (Constants.expoConfig?.extra as any)?.eas?.projectId ?? undefined;
  const fromEasConfig = (Constants as any).easConfig?.projectId ?? undefined;
  return fromExpoConfig ?? fromEasConfig;
};

/**
 * Ask the OS for notification permission, set up the Android channel, and
 * return the Expo Push Token. Safe to call repeatedly. In Expo Go this is
 * a no-op (returns isExpoGo: true).
 */
export const configurePushAsync = async (): Promise<{
  granted: boolean;
  expoPushToken: string | null;
  isExpoGo: boolean;
}> => {
  if (isExpoGo) {
    return { granted: false, expoPushToken: null, isExpoGo: true };
  }

  const N = ensureNotifications();
  if (!N) return { granted: false, expoPushToken: null, isExpoGo: false };

  if (Platform.OS === "android") {
    try {
      await N.setNotificationChannelAsync("default", {
        name: "Default",
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#C6F432",
        sound: "default"
      });
    } catch {
      /* silent */
    }
  }

  let { status } = await N.getPermissionsAsync();
  if (status !== "granted") {
    const req = await N.requestPermissionsAsync();
    status = req.status;
  }
  if (status !== "granted") {
    return { granted: false, expoPushToken: null, isExpoGo: false };
  }

  let token: string | null = null;
  try {
    const projectId = resolveProjectId();
    const r = projectId
      ? await N.getExpoPushTokenAsync({ projectId })
      : await N.getExpoPushTokenAsync();
    token = r?.data ?? null;
  } catch (e: any) {
    // eslint-disable-next-line no-console
    console.warn("[push] getExpoPushTokenAsync failed:", e?.message ?? e);
    token = null;
  }

  cachedToken = token;
  return { granted: true, expoPushToken: token, isExpoGo: false };
};

/**
 * After sign-in, register this device's push token with Supabase so the
 * server can route push notifications here. Idempotent — re-running just
 * updates last_seen_at.
 */
export const registerPushTokenForUser = async (
  userId: string
): Promise<{ token: string | null; granted: boolean }> => {
  const r = await configurePushAsync();
  if (!r.granted || !r.expoPushToken) {
    return { token: null, granted: r.granted };
  }

  const platform = Platform.OS === "ios" ? "ios" : "android";
  const now = new Date().toISOString();

  const { error } = await supabase.from("device_push_tokens").upsert(
    {
      user_id: userId,
      token: r.expoPushToken,
      platform,
      last_seen_at: now,
      updated_at: now
    },
    { onConflict: "token" }
  );

  if (error) {
    // eslint-disable-next-line no-console
    console.warn("[push] token upsert failed:", error.message);
  } else {
    // eslint-disable-next-line no-console
    console.log(
      "[push] token registered:",
      r.expoPushToken.slice(0, 30) + "…"
    );
  }

  return { token: r.expoPushToken, granted: true };
};

/**
 * On sign-out: drop this device's token from Supabase so further pushes
 * don't go to a logged-out account.
 */
export const unregisterPushTokenAsync = async (): Promise<void> => {
  if (!cachedToken) return;
  const t = cachedToken;
  cachedToken = null;
  try {
    await supabase.from("device_push_tokens").delete().eq("token", t);
  } catch {
    /* silent */
  }
};

/**
 * Listen for taps on push notifications. Returns an unsubscribe function.
 * The callback receives the `data` payload (notificationId, kind, …).
 */
export const subscribeNotificationTaps = (
  onTap: (data: Record<string, any>) => void
): (() => void) => {
  const N = ensureNotifications();
  if (!N) return () => {};
  const sub = N.addNotificationResponseReceivedListener((resp: any) => {
    const data = resp?.notification?.request?.content?.data ?? {};
    try {
      onTap(data);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn("[push] onTap handler threw", e);
    }
  });
  return () => {
    try {
      sub.remove();
    } catch {
      /* silent */
    }
  };
};

/**
 * Fire a foreground in-app banner. Only used when this device has NO push
 * token registered (Expo Go, permission denied, no EAS projectId). When a
 * token is registered, the server's Expo push will already display a
 * banner — firing a local one too would double-notify.
 */
export const fireLocalNotification = async (n: InAppNotification) => {
  if (isExpoGo) return;
  if (cachedToken) return; // server push handles delivery
  const N = ensureNotifications();
  if (!N) return;
  try {
    await N.scheduleNotificationAsync({
      content: {
        title: n.title,
        body: n.body,
        data: { notificationId: n.id, kind: n.kind, ...(n.payload ?? {}) }
      },
      trigger: null
    });
  } catch {
    /* silent */
  }
};

export const isPushSupported = (): boolean => !isExpoGo;
