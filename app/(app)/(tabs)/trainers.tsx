import React, { useMemo } from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import {
  ChevronRight,
  Phone,
  Plus,
  ShieldCheck,
  ShieldOff,
  Users
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Avatar } from "@/components/Avatar";
import { Chip } from "@/components/Chip";
import { Pressable } from "@/components/Pressable";
import { BottomBar } from "@/components/BottomBar";
import { Button } from "@/components/Button";
import { useData } from "@/store/data";
import { colors } from "@/theme/tokens";

export default function Trainers() {
  const insets = useSafeAreaInsets();
  const trainers = useData((s) => s.trainers);
  const clients = useData((s) => s.clients);

  const clientCountByTrainer = useMemo(() => {
    const m = new Map<string, number>();
    clients.forEach((c) => {
      if (c.status === "Completed") return;
      m.set(c.trainerId, (m.get(c.trainerId) ?? 0) + 1);
    });
    return m;
  }, [clients]);

  const activeCount = trainers.filter((t) => t.isActive).length;

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
            paddingBottom: insets.bottom + 200,
            paddingTop: 4
          }}
        >
          <View className="mt-2 mb-6">
            <Text variant="caption" className="text-ink-3">
              TEAM
            </Text>
            <Text variant="h1" className="text-ink">
              Trainers
            </Text>
            <Text variant="caption" className="text-ink-2 mt-1">
              {activeCount} active · {trainers.length - activeCount}{" "}
              deactivated · admin manages access
            </Text>
          </View>

          {trainers.length === 0 ? (
            <View className="rounded-2xl border border-line bg-surface p-6 items-center">
              <Text variant="body" className="text-ink-2 text-center">
                No trainers yet. Tap "New Trainer" below.
              </Text>
            </View>
          ) : (
            <View style={{ gap: 8 }}>
              {trainers.map((t, i) => {
                const count = clientCountByTrainer.get(t.id) ?? 0;
                return (
                  <MotiView
                    key={t.id}
                    from={{ opacity: 0, translateY: 8 }}
                    animate={{ opacity: 1, translateY: 0 }}
                    transition={{
                      type: "spring",
                      damping: 18,
                      stiffness: 200,
                      delay: 50 + i * 35
                    }}
                  >
                    <Pressable
                      onPress={() =>
                        router.push(`/(app)/edit-trainer?id=${t.id}`)
                      }
                      haptic="light"
                      className={`flex-row items-center rounded-2xl border p-3.5 ${
                        t.isActive
                          ? "border-line bg-surface"
                          : "border-line bg-white/[0.02] opacity-70"
                      }`}
                    >
                      <Avatar
                        initials={t.initials}
                        size={44}
                        imageUri={t.avatarUri}
                      />
                      <View className="flex-1 ml-3 mr-2">
                        <View className="flex-row items-center">
                          <Text
                            variant="h3"
                            className="text-ink"
                            numberOfLines={1}
                          >
                            {t.name}
                          </Text>
                          {!t.isActive ? (
                            <View className="ml-2">
                              <Chip
                                label="Off"
                                tone="neutral"
                                iconLeft={
                                  <ShieldOff
                                    size={9}
                                    color={colors.ink3}
                                    strokeWidth={2.6}
                                  />
                                }
                              />
                            </View>
                          ) : null}
                        </View>
                        <View className="flex-row items-center mt-0.5">
                          <Phone
                            size={11}
                            color={colors.ink3}
                            strokeWidth={2.4}
                          />
                          <Text
                            variant="caption"
                            className="text-ink-2 ml-1"
                            tabular
                          >
                            {t.mobile}
                          </Text>
                          <View className="w-1 h-1 rounded-full bg-ink-4 mx-1.5" />
                          <Text
                            variant="caption"
                            className="text-ink-3"
                            tabular
                          >
                            {t.age}
                            {t.gender}
                          </Text>
                          <View className="w-1 h-1 rounded-full bg-ink-4 mx-1.5" />
                          <View className="flex-row items-center">
                            <Users
                              size={11}
                              color={colors.ink3}
                              strokeWidth={2.4}
                            />
                            <Text
                              variant="caption"
                              className="text-ink-3 ml-1"
                              tabular
                            >
                              {count}
                            </Text>
                          </View>
                        </View>
                      </View>
                      <ChevronRight
                        size={18}
                        color={colors.ink3}
                        strokeWidth={2}
                      />
                    </Pressable>
                  </MotiView>
                );
              })}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      <BottomBar tabSafe>
        <Button
          label="New Trainer"
          size="lg"
          fullWidth
          iconLeft={<Plus size={18} color="#0A0B0D" strokeWidth={2.6} />}
          onPress={() => router.push("/(app)/new-trainer")}
        />
      </BottomBar>
    </View>
  );
}
