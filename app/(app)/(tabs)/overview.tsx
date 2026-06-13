import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import {
  AlertTriangle,
  Archive,
  CheckCircle2,
  Inbox as InboxIcon,
  LogOut,
  Star,
  UserCog,
  Users,
  BookMarked,
  Activity
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { Logo } from "@/components/Logo";
import { useAuth } from "@/store/auth";
import { useData, type AdminStats } from "@/store/data";
import { useNotifications } from "@/store/notifications";
import { timeAgo } from "@/lib/format";
import { colors } from "@/theme/tokens";

export default function Overview() {
  const user = useAuth((s) => s.user)!;
  const signOut = useAuth((s) => s.signOut);
  const insets = useSafeAreaInsets();

  const plansAll = useData((s) => s.plans);
  const fetchAdminStats = useData((s) => s.fetchAdminStats);
  const items = useNotifications((s) => s.items);

  // Dashboard stats from the server (correct beyond the in-memory 1000 cap).
  const [statsRemote, setStatsRemote] = useState<AdminStats | null>(null);
  useEffect(() => {
    let alive = true;
    fetchAdminStats()
      .then((s) => alive && setStatsRemote(s))
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [fetchAdminStats]);
  const stats: AdminStats = statsRemote ?? {
    activeClients: 0,
    critical: 0,
    completed: 0,
    trainers: 0,
    avgRating: 0
  };

  const recentNotifs = useMemo(
    () =>
      items
        .filter((n) => n.recipientRole === "admin")
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )
        .slice(0, 3),
    [items]
  );

  const unreadCount = recentNotifs.filter((n) => !n.isRead).length;
  const activePlans = plansAll.filter((p) => p.status === "active").length;
  const ratedPlans = plansAll.filter((p) => p.avgRating > 0).length;

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#1A2008", "#0F1308", "#0A0B0D"]}
        locations={[0, 0.25, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 110,
            paddingTop: 4
          }}
        >
          {/* Header */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 280 }}
            className="flex-row items-center justify-between mt-2 mb-6"
          >
            <View className="flex-row items-center flex-1">
              <Logo size={44} animate={false} />
              <View className="ml-3">
                <Text variant="caption" className="text-lime">
                  ADMIN
                </Text>
                <Text variant="h2" className="text-ink">
                  Overview
                </Text>
              </View>
            </View>
            <Pressable
              onPress={async () => {
                await signOut();
                router.replace("/login");
              }}
              haptic="medium"
              className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03]"
            >
              <LogOut size={18} color={colors.ink2} strokeWidth={2} />
            </Pressable>
          </MotiView>

          {/* HERO — wide active-clients card */}
          <HeroStat
            label="Active Clients"
            value={stats.activeClients}
            sublabel={`across ${stats.trainers} trainer${stats.trainers === 1 ? "" : "s"}`}
            icon={<Users size={14} color={colors.lime} strokeWidth={2.4} />}
            delay={60}
          />

          {/* Triple compact row */}
          <View className="flex-row mt-2.5" style={{ gap: 10 }}>
            <CompactStat
              label="Avg ★"
              value={stats.avgRating}
              decimals={1}
              icon={
                <Star
                  size={12}
                  color={colors.lime}
                  fill={colors.lime}
                  strokeWidth={2}
                />
              }
              tone="lime"
              delay={120}
            />
            <CompactStat
              label="Critical"
              value={stats.critical}
              icon={
                <AlertTriangle
                  size={12}
                  color={colors.danger}
                  strokeWidth={2.4}
                />
              }
              tone="danger"
              delay={170}
            />
            <CompactStat
              label="Completed"
              value={stats.completed}
              icon={
                <CheckCircle2
                  size={12}
                  color={colors.success}
                  strokeWidth={2.4}
                />
              }
              tone="neutral"
              delay={220}
            />
          </View>

          {/* QUICK ACTIONS — 2x2 grid */}
          <View className="mt-6 mb-3">
            <Text variant="label" className="text-ink-3">
              QUICK ACTIONS
            </Text>
          </View>

          <View className="flex-row" style={{ gap: 10 }}>
            <ActionTile
              icon={<Users size={18} color={colors.lime} strokeWidth={2.2} />}
              label="All Clients"
              count={stats.activeClients}
              onPress={() => router.push("/(app)/clients")}
              delay={260}
              tone="lime"
            />
            <ActionTile
              icon={
                <UserCog size={18} color={colors.info} strokeWidth={2.2} />
              }
              label="Trainers"
              count={stats.trainers}
              onPress={() => router.push("/(app)/trainers")}
              delay={300}
              tone="info"
            />
          </View>

          <View className="flex-row mt-2.5" style={{ gap: 10 }}>
            <ActionTile
              icon={
                <BookMarked
                  size={18}
                  color={colors.warn}
                  strokeWidth={2.2}
                />
              }
              label="Library"
              sub="Saved templates"
              onPress={() => router.push("/(app)/library")}
              delay={340}
              tone="warn"
            />
            <ActionTile
              icon={
                <Archive
                  size={18}
                  color={colors.success}
                  strokeWidth={2.2}
                />
              }
              label="Completed"
              count={stats.completed}
              onPress={() => router.push("/(app)/clients")}
              delay={380}
              tone="success"
            />
          </View>

          {/* RECENT NOTIFICATIONS */}
          {recentNotifs.length > 0 ? (
            <>
              <View className="flex-row items-center justify-between mt-7 mb-3">
                <View className="flex-row items-center">
                  <InboxIcon
                    size={13}
                    color={colors.ink3}
                    strokeWidth={2.2}
                  />
                  <Text variant="label" className="text-ink-3 ml-1.5">
                    RECENT
                  </Text>
                  {unreadCount > 0 ? (
                    <View
                      className="ml-2 px-1.5 py-0.5 rounded-md"
                      style={{ backgroundColor: colors.lime }}
                    >
                      <Text
                        tabular
                        style={{
                          color: "#0A0B0D",
                          fontSize: 9,
                          fontFamily: "Inter_700Bold"
                        }}
                      >
                        {unreadCount} new
                      </Text>
                    </View>
                  ) : null}
                </View>
                <Pressable
                  onPress={() => router.push("/(app)/notifications")}
                  haptic="light"
                >
                  <Text variant="caption" className="text-lime">
                    See all
                  </Text>
                </Pressable>
              </View>
              <MotiView
                from={{ opacity: 0, translateY: 8 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: "spring",
                  damping: 18,
                  stiffness: 200,
                  delay: 420
                }}
                className="rounded-2xl border border-line bg-surface overflow-hidden"
              >
                {recentNotifs.map((n, i) => (
                  <View
                    key={n.id}
                    className={`flex-row items-center px-3.5 py-3 ${
                      i > 0 ? "border-t border-line" : ""
                    }`}
                  >
                    <View
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: n.isRead ? colors.ink4 : colors.lime,
                        marginRight: 10
                      }}
                    />
                    <View className="flex-1">
                      <Text
                        variant="bodyMedium"
                        className="text-ink"
                        numberOfLines={1}
                        style={{ fontFamily: "Inter_600SemiBold" }}
                      >
                        {n.title}
                      </Text>
                      <Text
                        variant="caption"
                        className="text-ink-3 mt-0.5"
                        numberOfLines={1}
                      >
                        {n.body}
                      </Text>
                    </View>
                    <Text variant="caption" className="text-ink-4 ml-2">
                      {timeAgo(n.createdAt)}
                    </Text>
                  </View>
                ))}
              </MotiView>
            </>
          ) : null}

          {/* Plan activity glance */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 18,
              stiffness: 200,
              delay: 480
            }}
            className="mt-6 rounded-2xl border border-line bg-surface p-4 flex-row items-center"
          >
            <View className="w-9 h-9 rounded-xl bg-lime/15 items-center justify-center mr-3">
              <Activity size={16} color={colors.lime} strokeWidth={2.2} />
            </View>
            <View className="flex-1">
              <Text variant="caption" className="text-ink-3">
                PLAN ACTIVITY
              </Text>
              <View className="flex-row items-baseline flex-wrap mt-0.5">
                <Text
                  variant="bodyMedium"
                  className="text-ink"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                  tabular
                >
                  {plansAll.length}
                </Text>
                <Text variant="caption" className="text-ink-3 ml-1">
                  total ·
                </Text>
                <Text
                  variant="bodyMedium"
                  className="text-ink ml-1.5"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                  tabular
                >
                  {activePlans}
                </Text>
                <Text variant="caption" className="text-ink-3 ml-1">
                  active ·
                </Text>
                <Text
                  variant="bodyMedium"
                  className="text-ink ml-1.5"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                  tabular
                >
                  {ratedPlans}
                </Text>
                <Text variant="caption" className="text-ink-3 ml-1">
                  rated
                </Text>
              </View>
            </View>
          </MotiView>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function HeroStat({
  label,
  value,
  sublabel,
  icon,
  delay
}: {
  label: string;
  value: number;
  sublabel: string;
  icon: React.ReactNode;
  delay: number;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 200, delay }}
      className="rounded-2xl border border-lime/30 overflow-hidden"
    >
      <LinearGradient
        colors={["rgba(254,127,11,0.18)", "rgba(254,127,11,0.03)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View className="p-4">
        <View className="flex-row items-center">
          {icon}
          <Text variant="caption" className="text-lime ml-1.5">
            {label.toUpperCase()}
          </Text>
        </View>
        <View className="flex-row items-baseline mt-1">
          <AnimatedNumber
            value={value}
            style={{
              fontSize: 36,
              lineHeight: 42,
              letterSpacing: -1,
              color: "#FFA94D",
              fontFamily: "Inter_700Bold"
            }}
          />
          <Text variant="caption" className="text-ink-2 ml-2 flex-1">
            {sublabel}
          </Text>
        </View>
      </View>
    </MotiView>
  );
}

function CompactStat({
  label,
  value,
  decimals = 0,
  icon,
  tone,
  delay
}: {
  label: string;
  value: number;
  decimals?: number;
  icon: React.ReactNode;
  tone: "lime" | "danger" | "neutral";
  delay: number;
}) {
  const borderColor =
    tone === "lime"
      ? "border-lime/25"
      : tone === "danger"
      ? "border-danger/25"
      : "border-line";
  const bg =
    tone === "lime"
      ? "bg-lime/[0.05]"
      : tone === "danger"
      ? "bg-danger/[0.05]"
      : "bg-surface";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 200, delay }}
      className={`flex-1 rounded-2xl border ${borderColor} ${bg} p-3`}
    >
      <View className="flex-row items-center">
        {icon}
        <Text variant="caption" className="text-ink-3 ml-1" numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      </View>
      <View className="mt-1">
        <AnimatedNumber
          value={value}
          decimals={decimals}
          style={{
            fontSize: 20,
            lineHeight: 24,
            letterSpacing: -0.4,
            color: "#FFFFFF",
            fontFamily: "Inter_700Bold"
          }}
        />
      </View>
    </MotiView>
  );
}

function ActionTile({
  icon,
  label,
  count,
  sub,
  onPress,
  delay,
  tone
}: {
  icon: React.ReactNode;
  label: string;
  count?: number;
  sub?: string;
  onPress: () => void;
  delay: number;
  tone: "lime" | "info" | "warn" | "success";
}) {
  const ringBg =
    tone === "lime"
      ? "rgba(254,127,11,0.15)"
      : tone === "info"
      ? "rgba(96,165,250,0.15)"
      : tone === "warn"
      ? "rgba(251,191,36,0.15)"
      : "rgba(52,211,153,0.15)";

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "spring", damping: 18, stiffness: 200, delay }}
      className="flex-1"
    >
      <Pressable
        onPress={onPress}
        haptic="light"
        scaleTo={0.96}
        className="rounded-2xl border border-line bg-surface p-3.5"
      >
        <View className="flex-row items-center justify-between">
          <View
            className="w-9 h-9 rounded-xl items-center justify-center"
            style={{ backgroundColor: ringBg }}
          >
            {icon}
          </View>
          {count !== undefined ? (
            <Text
              tabular
              style={{
                color: "#FFFFFF",
                fontFamily: "Inter_700Bold",
                fontSize: 16,
                letterSpacing: -0.3
              }}
            >
              {count}
            </Text>
          ) : null}
        </View>
        <Text
          variant="bodyMedium"
          className="text-ink mt-2.5"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {label}
        </Text>
        {sub ? (
          <Text variant="caption" className="text-ink-3 mt-0.5">
            {sub}
          </Text>
        ) : null}
      </Pressable>
    </MotiView>
  );
}
