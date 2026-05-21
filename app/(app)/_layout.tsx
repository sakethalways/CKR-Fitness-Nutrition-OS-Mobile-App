import React from "react";
import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/store/auth";

/**
 * Auth-gated Stack. The Tabs live inside (tabs)/ — they're the *root* stack
 * screen. All sub-routes (client/[id], plan-detail, meals, generate, etc.)
 * are stack siblings, so they push cleanly on top of the tabs and pop back
 * to the exact previous screen via the system back button / gesture.
 *
 * Stack also unmounts screens when they're popped, so revisiting /meals
 * triggers a fresh mount → loading screen reappears, fresh image + quote.
 */
export default function AppLayout() {
  const user = useAuth((s) => s.user);
  if (!user) return <Redirect href="/login" />;

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: "#0A0B0D" },
        animation: "slide_from_right",
        animationDuration: 240
      }}
    >
      <Stack.Screen name="(tabs)" options={{ animation: "fade" }} />
    </Stack>
  );
}
