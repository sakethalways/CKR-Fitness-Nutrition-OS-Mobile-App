import React, { useMemo, useState } from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import { Plus, Users2, Archive } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Avatar } from "@/components/Avatar";
import { StatCard } from "@/components/StatCard";
import { ClientRow } from "@/components/ClientRow";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import { computeTrainerStats, computeAdminStats } from "@/store/data";
import { colors } from "@/theme/tokens";

type AdminTab = "active" | "completed";

export default function Clients() {
  const user = useAuth((s) => s.user)!;
  const insets = useSafeAreaInsets();
  const isAdmin = user.role === "admin";

  const trainerId = !isAdmin ? user.trainer.id : null;
  const [adminTab, setAdminTab] = useState<AdminTab>("active");

  // Subscribe to the raw array (reference-stable). Filtering happens in
  // useMemo so we don't return a brand-new array from the selector each
  // render (which would loop the subscription).
  const clientsAll = useData((s) => s.clients);
  const plansAll = useData((s) => s.plans);
  // Reactive trainer lookup so the header avatar always reflects the latest
  // profile picture / name.
  const trainerData = useData((s) =>
    !isAdmin ? s.trainers.find((t) => t.id === user.trainer.id) : undefined
  );

  const clients = useMemo(() => {
    if (!isAdmin)
      return clientsAll.filter(
        (c) => c.trainerId === trainerId && c.status !== "Completed"
      );
    if (adminTab === "active")
      return clientsAll.filter((c) => c.status !== "Completed");
    return clientsAll.filter((c) => c.status === "Completed");
  }, [clientsAll, isAdmin, trainerId, adminTab]);

  const trainerStats = useMemo(
    () => (trainerId ? computeTrainerStats(trainerId) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [trainerId, clientsAll, plansAll]
  );
  const adminStats = useMemo(
    () => (isAdmin ? computeAdminStats() : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [isAdmin, clientsAll, plansAll]
  );

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#11160B", "#0A0B0D", "#0A0B0D"]}
        locations={[0, 0.35, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + (isAdmin ? 110 : 200),
            paddingTop: 4
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 280 }}
            className="flex-row items-center mt-2 mb-5"
          >
            <Avatar
              initials={
                trainerData?.initials ??
                (user.role === "admin"
                  ? user.admin.initials
                  : user.trainer.initials)
              }
              imageUri={trainerData?.avatarUri}
              size={40}
              tone="lime"
            />
            <View className="ml-3 flex-1">
              <Text variant="caption" className="text-ink-3">
                {isAdmin ? "ALL CLIENTS" : "MY CLIENTS"}
              </Text>
              <Text variant="h2" className="text-ink">
                {isAdmin
                  ? "Across team"
                  : `Hi, ${(trainerData?.name ?? user.trainer.name).split(" ")[0]}`}
              </Text>
            </View>
          </MotiView>

          {isAdmin && adminStats ? (
            <View className="flex-row" style={{ gap: 8 }}>
              <StatCard
                label="Active"
                value={adminStats.activeClients}
                tone="lime"
                delay={80}
              />
              <StatCard
                label="Critical"
                value={adminStats.critical}
                delay={140}
              />
              <StatCard
                label="Avg ★"
                value={adminStats.avgRating}
                decimals={1}
                delay={200}
              />
            </View>
          ) : trainerStats ? (
            <View className="flex-row" style={{ gap: 8 }}>
              <StatCard
                label="Active"
                value={trainerStats.activeClients}
                tone="lime"
                delay={80}
              />
              <StatCard
                label="Plans · 7d"
                value={trainerStats.plansThisWeek}
                delay={140}
              />
              <StatCard
                label="Avg ★"
                value={trainerStats.avgRating}
                decimals={1}
                delay={200}
              />
            </View>
          ) : null}

          {/* Admin: Active vs Completed tabs */}
          {isAdmin ? (
            <View className="mt-5">
              <SegmentedControl<AdminTab>
                value={adminTab}
                onChange={setAdminTab}
                options={[
                  { value: "active", label: "Active" },
                  { value: "completed", label: "Completed" }
                ]}
              />
            </View>
          ) : null}

          <View className="flex-row items-center justify-between mt-5 mb-3">
            <View className="flex-row items-center">
              {isAdmin && adminTab === "completed" ? (
                <Archive size={13} color={colors.ink3} strokeWidth={2.2} />
              ) : (
                <Users2 size={13} color={colors.ink3} strokeWidth={2.2} />
              )}
              <Text variant="label" className="text-ink-3 ml-1.5">
                {isAdmin
                  ? adminTab === "active"
                    ? `ACTIVE · ${clients.length}`
                    : `COMPLETED · ${clients.length}`
                  : `MY CLIENTS · ${clients.length}`}
              </Text>
            </View>
          </View>

          <View style={{ gap: 8 }}>
            {clients.length === 0 ? (
              <View className="rounded-2xl border border-line bg-surface p-6 items-center">
                <Text variant="body" className="text-ink-2 text-center">
                  {isAdmin
                    ? adminTab === "active"
                      ? "No active clients yet."
                      : "No completed clients yet."
                    : 'No clients yet. Tap "New Client" below.'}
                </Text>
              </View>
            ) : (
              clients.map((c, i) => (
                <ClientRow
                  key={c.id}
                  client={c}
                  index={i}
                  showTrainer={isAdmin}
                  onPress={() => router.push(`/(app)/client/${c.id}`)}
                />
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {!isAdmin ? (
        <BottomBar tabSafe>
          <Button
            label="New Client"
            size="lg"
            fullWidth
            iconLeft={<Plus size={18} color="#0A0B0D" strokeWidth={2.6} />}
            onPress={() => router.push("/(app)/new")}
          />
        </BottomBar>
      ) : null}
    </View>
  );
}
