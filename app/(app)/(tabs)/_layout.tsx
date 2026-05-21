import React from "react";
import { Platform, View } from "react-native";
import { Tabs } from "expo-router";
import { BlurView } from "expo-blur";
import {
  Users,
  Bell,
  User,
  LayoutDashboard,
  UserCog,
  BookMarked
} from "lucide-react-native";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import { Text } from "@/components/Text";
import { colors } from "@/theme/tokens";

// Initial focus tab — both roles see "clients" so this is a safe default.
export const unstable_settings = {
  initialRouteName: "clients"
};

const HIDDEN = { href: null as any };

function TabBarBackground() {
  return (
    <>
      {Platform.OS === "ios" ? (
        <BlurView
          intensity={30}
          tint="dark"
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <View
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor:
            Platform.OS === "ios" ? "rgba(10,11,13,0.85)" : "#0F1115"
        }}
      />
    </>
  );
}

function BellWithBadge({
  color,
  size,
  count
}: {
  color: string;
  size: number;
  count: number;
}) {
  return (
    <View>
      <Bell size={size} color={color} strokeWidth={2.2} />
      {count > 0 ? (
        <View
          style={{
            position: "absolute",
            top: -4,
            right: -6,
            minWidth: 16,
            height: 16,
            borderRadius: 8,
            paddingHorizontal: 4,
            backgroundColor: colors.lime,
            borderWidth: 2,
            borderColor: "#0A0B0D",
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Text
            tabular
            style={{
              color: "#0A0B0D",
              fontSize: 9,
              fontFamily: "Inter_700Bold",
              lineHeight: 10
            }}
          >
            {count > 9 ? "9+" : count}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

export default function TabsLayout() {
  const user = useAuth((s) => s.user);
  const userId = user
    ? user.role === "admin"
      ? user.admin.id
      : user.trainer.id
    : null;
  const unreadCount = useNotifications((s) =>
    user && userId
      ? s.items.filter(
          (n) =>
            n.recipientRole === user.role &&
            n.recipientId === userId &&
            !n.isRead
        ).length
      : 0
  );

  // Auth gate handled in the parent Stack — guard once more so this layout
  // never renders without a user.
  if (!user) return null;
  const isAdmin = user.role === "admin";

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.lime,
        tabBarInactiveTintColor: colors.ink3,
        tabBarShowLabel: true,
        tabBarStyle: {
          position: "absolute",
          borderTopWidth: 0,
          backgroundColor: "transparent",
          elevation: 0,
          height: 64 + (Platform.OS === "ios" ? 18 : 0),
          paddingTop: 6,
          paddingBottom: Platform.OS === "ios" ? 22 : 10
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontFamily: "Inter_600SemiBold",
          letterSpacing: 0.3,
          marginTop: 2
        },
        tabBarBackground: TabBarBackground,
        tabBarHideOnKeyboard: true,
        sceneStyle: { backgroundColor: "#0A0B0D" } as any
      }}
    >
      <Tabs.Screen
        name="clients"
        options={{
          title: "Clients",
          tabBarIcon: ({ color }) => (
            <Users size={20} color={color} strokeWidth={2.2} />
          )
        }}
      />
      <Tabs.Screen
        name="overview"
        options={{
          title: "Overview",
          tabBarIcon: ({ color }) => (
            <LayoutDashboard size={20} color={color} strokeWidth={2.2} />
          ),
          ...(isAdmin ? {} : HIDDEN)
        }}
      />
      <Tabs.Screen
        name="trainers"
        options={{
          title: "Trainers",
          tabBarIcon: ({ color }) => (
            <UserCog size={20} color={color} strokeWidth={2.2} />
          ),
          ...(isAdmin ? {} : HIDDEN)
        }}
      />
      <Tabs.Screen
        name="library"
        options={{
          title: "Library",
          tabBarIcon: ({ color }) => (
            <BookMarked size={20} color={color} strokeWidth={2.2} />
          ),
          ...(isAdmin ? {} : HIDDEN)
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: "Inbox",
          tabBarIcon: ({ color, size }) => (
            <BellWithBadge color={color} size={size ?? 20} count={unreadCount} />
          )
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          tabBarIcon: ({ color }) => (
            <User size={20} color={color} strokeWidth={2.2} />
          ),
          ...(isAdmin ? HIDDEN : {})
        }}
      />
    </Tabs>
  );
}
