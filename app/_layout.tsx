import "../global.css";
import React, { useEffect, useRef } from "react";
import { Stack, router } from "expo-router";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import * as SplashScreen from "expo-splash-screen";
import { useFonts } from "expo-font";
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold
} from "@expo-google-fonts/inter";
import { View, Text, ScrollView } from "react-native";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import { useNotifications } from "@/store/notifications";
import { useLibrary } from "@/store/library";
import {
  configurePushAsync,
  fireLocalNotification,
  subscribeNotificationTaps,
  getLastNotificationResponseData
} from "@/lib/push";
import {
  routeFromPushData,
  FALLBACK_NOTIFICATIONS_ROUTE
} from "@/lib/notificationRouting";
import { supabaseInitError, pingSupabase } from "@/lib/supabase";
import { ErrorBoundary } from "@/components/ErrorBoundary";

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const [loaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold
  });

  const user = useAuth((s) => s.user);
  const hasHydrated = useAuth((s) => s.hasHydrated);
  const initAuth = useAuth((s) => s.init);
  const ready = loaded && hasHydrated;

  // ---- Diagnostics (so Metro shows where we are) ----
  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[app] mount", { hasFont: loaded, fontError: fontError?.message });
  }, [loaded, fontError]);

  // Reachability check on launch — independent of supabase-js
  useEffect(() => {
    pingSupabase().then((r) => {
      // eslint-disable-next-line no-console
      if (r.ok) {
        console.log(`[supabase ping] ✓ ${r.status} in ${r.ms}ms`);
      } else {
        console.warn(
          `[supabase ping] ✗ in ${r.ms}ms — status=${r.status ?? "?"} err=${r.error ?? "(no error)"}`
        );
      }
    });
  }, []);

  useEffect(() => {
    // eslint-disable-next-line no-console
    console.log("[app] auth init starting");
    let resolved = false;
    initAuth()
      .then(() => {
        resolved = true;
        // eslint-disable-next-line no-console
        console.log("[app] auth init done");
      })
      .catch((e) => {
        resolved = true;
        // eslint-disable-next-line no-console
        console.error("[app] auth init failed", e);
      });
    // Last-ditch safety: never let the splash hang forever. Set above the
    // auth getSession window (8s) so we don't force a premature "signed-out"
    // render while a slow token refresh is still resolving.
    const t = setTimeout(() => {
      if (!resolved) {
        // eslint-disable-next-line no-console
        console.warn(
          "[app] auth init exceeded 11s — force-hydrating so login can render"
        );
        useAuth.setState({ hasHydrated: true, initializing: false });
      }
    }, 11000);
    return () => clearTimeout(t);
  }, [initAuth]);

  useEffect(() => {
    if (ready) SplashScreen.hideAsync().catch(() => {});
  }, [ready]);

  useEffect(() => {
    if (ready) configurePushAsync().catch(() => {});
  }, [ready]);

  // Notification tap → smart route. Single handler shared by:
  //   (a) live taps (foreground/background)   — addNotificationResponseReceivedListener
  //   (b) cold-start taps (app was killed)    — getLastNotificationResponseAsync
  // We also mark the underlying notifications row as read so the inbox stays
  // in sync. Routing logic is delegated to @/lib/notificationRouting so the
  // banner tap lands on the same screen as an inbox-row tap would.
  const handleNotificationTap = React.useCallback(
    (data: Record<string, any> | null) => {
      if (!data) return;
      // eslint-disable-next-line no-console
      console.log("[push] tap →", data);
      const notifId = data.notificationId as string | undefined;
      if (notifId) {
        useNotifications.getState().markRead(notifId).catch(() => {});
      }
      const target =
        routeFromPushData(data) ?? FALLBACK_NOTIFICATIONS_ROUTE;
      router.push(target as any);
    },
    []
  );

  // Live listener
  useEffect(() => {
    const unsub = subscribeNotificationTaps(handleNotificationTap);
    return unsub;
  }, [handleNotificationTap]);

  // Cold start: handle a tap that launched the app from a killed state.
  // We wait for the user to be signed in so the route push doesn't bounce
  // off the login screen.
  const coldStartHandledRef = useRef(false);
  useEffect(() => {
    if (coldStartHandledRef.current) return;
    if (!ready || !user) return;
    coldStartHandledRef.current = true;
    getLastNotificationResponseData()
      .then((data) => {
        if (data) handleNotificationTap(data);
      })
      .catch(() => {});
  }, [ready, user, handleNotificationTap]);

  const lastUserId = useRef<string | null>(null);
  useEffect(() => {
    if (!user) {
      useData.getState().dispose();
      useNotifications.getState().dispose();
      useLibrary.getState().dispose();
      lastUserId.current = null;
      return;
    }
    const uid = user.role === "admin" ? user.admin.id : user.trainer.id;
    if (lastUserId.current === uid) return;
    lastUserId.current = uid;
    // eslint-disable-next-line no-console
    console.log("[app] user signed in →", user.role, uid);
    useData.getState().init(user.role);
    useNotifications.getState().init(user.role, uid);
    useLibrary.getState().init();
  }, [user]);

  const lastSeenId = useRef<string | null>(null);
  const items = useNotifications((s) => s.items);
  useEffect(() => {
    if (!user || items.length === 0) return;
    const myId = user.role === "admin" ? user.admin.id : user.trainer.id;
    const latest = items.find(
      (n) => n.recipientRole === user.role && n.recipientId === myId
    );
    if (!latest) return;
    if (lastSeenId.current === null) {
      lastSeenId.current = latest.id;
      return;
    }
    if (latest.id !== lastSeenId.current && !latest.isRead) {
      lastSeenId.current = latest.id;
      fireLocalNotification(latest);
    }
  }, [items, user]);

  // ---- Visible failure screens (no more silent blank) ----

  if (supabaseInitError) {
    return <ConfigErrorScreen message={supabaseInitError} />;
  }

  if (fontError) {
    return (
      <ConfigErrorScreen
        message={`Couldn't load fonts: ${fontError.message}`}
      />
    );
  }

  if (!ready) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: "#0A0B0D",
          alignItems: "center",
          justifyContent: "center"
        }}
      >
        <Text style={{ color: "#94A3B8", fontSize: 13 }}>
          {!loaded ? "Loading fonts…" : "Connecting to Supabase…"}
        </Text>
      </View>
    );
  }

  return (
    <ErrorBoundary>
      <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0A0B0D" }}>
        <SafeAreaProvider>
          <StatusBar style="light" />
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: "#0A0B0D" },
              animation: "fade",
              animationDuration: 220
            }}
          />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ErrorBoundary>
  );
}

function ConfigErrorScreen({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        backgroundColor: "#0A0B0D",
        padding: 24,
        paddingTop: 60
      }}
    >
      <Text
        style={{
          color: "#FBBF24",
          fontSize: 20,
          fontWeight: "700",
          marginBottom: 12
        }}
      >
        Setup needed
      </Text>
      <ScrollView
        style={{
          backgroundColor: "#14161B",
          borderColor: "rgba(255,255,255,0.1)",
          borderWidth: 1,
          borderRadius: 12,
          padding: 14
        }}
      >
        <Text
          style={{
            color: "#FFFFFF",
            fontFamily: "monospace",
            fontSize: 13,
            lineHeight: 20
          }}
        >
          {message}
        </Text>
      </ScrollView>
    </View>
  );
}
