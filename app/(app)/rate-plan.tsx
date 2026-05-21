import React, { useMemo, useState } from "react";
import { View, ScrollView, StatusBar, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { ArrowLeft, Check, Star } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { RatingPill } from "@/components/RatingPill";
import { selectClient, selectPlan, useData } from "@/store/data";
import { seedMeals } from "@/data/meals";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import { getAdminId } from "@/lib/admin";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

export default function RatePlan() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const insets = useSafeAreaInsets();
  const saveRatings = useData((s) => s.saveRatings);
  const pushNotification = useNotifications((s) => s.safePush);
  const user = useAuth((s) => s.user);
  // subscribe to plans for re-render
  useData((s) => s.plans);

  const plan = useMemo(
    () => (planId ? selectPlan(planId) : undefined),
    [planId]
  );
  const client = useMemo(
    () => (plan ? selectClient(plan.clientId) : undefined),
    [plan]
  );

  const meals = useMemo(() => {
    if (!plan?.selectedMealIds) return [];
    return plan.selectedMealIds
      .map((id) => seedMeals.find((m) => m.id === id))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [plan]);

  const [ratings, setRatings] = useState<Record<string, number>>(
    plan?.ratings ?? {}
  );
  const [done, setDone] = useState(false);

  if (!plan || !client) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text variant="body" className="text-ink-2 text-center mb-4">
          Plan not found.
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  // Older seed plans may not carry meal IDs (pre-Phase 4 data) — guard clearly.
  if (meals.length === 0) {
    return (
      <View className="flex-1 bg-bg">
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={["#11160B", "#0A0B0D", "#0A0B0D"]}
          locations={[0, 0.4, 1]}
          style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
        />
        <SafeAreaView edges={["top"]} className="flex-1 px-5">
          <View className="flex-row items-center mt-2 mb-6">
            <Pressable
              onPress={() => router.back()}
              className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03] mr-3"
            >
              <ArrowLeft size={18} color={colors.ink} strokeWidth={2.2} />
            </Pressable>
            <Text variant="h1" className="text-ink">
              Rate plan
            </Text>
          </View>
          <View className="rounded-2xl border border-line bg-surface p-5">
            <Text variant="h3" className="text-ink mb-2">
              No meals attached
            </Text>
            <Text variant="body" className="text-ink-2">
              This is an older plan from before meal selections were tracked.
              Rate the next plan you generate.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const onSave = async () => {
    const ratedCount = Object.keys(ratings).length;
    if (ratedCount === 0) {
      Alert.alert("No ratings entered", "Tap a score 1–10 for at least one meal.");
      return;
    }
    if (!user || user.role !== "trainer") return;
    try {
      await saveRatings(plan.id, ratings, user.trainer.id);
      const avg =
        Object.values(ratings).reduce((a, b) => a + b, 0) /
        Object.keys(ratings).length;
      const adminId = await getAdminId();
      if (adminId) {
        await pushNotification({
          recipientRole: "admin",
          recipientId: adminId,
          kind: "new_rating",
          title: "New ratings submitted",
          body: `${user.trainer.name.split(" ")[0]} rated Plan ${plan.weekNumber} for ${client.name} — ${avg.toFixed(1)} avg.`,
          payload: {
            clientId: client.id,
            planId: plan.id,
            trainerId: user.trainer.id
          }
        });
      }
      setDone(true);
      haptics.success();
      setTimeout(() => router.back(), 700);
    } catch (e: any) {
      haptics.warning();
      Alert.alert("Couldn't save ratings", e?.message ?? String(e));
    }
  };

  const ratedCount = Object.keys(ratings).length;

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#11160B", "#0A0B0D", "#0A0B0D"]}
        locations={[0, 0.4, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        <View className="flex-row items-center justify-between px-5 mt-2 mb-3">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03]"
          >
            <ArrowLeft size={18} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <Text variant="label" className="text-ink-3">
            RATE PLAN
          </Text>
          <View className="w-11 h-11" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 120
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="flex-row items-center mb-5"
          >
            <Avatar initials={client.initials} size={44} tone="lime" />
            <View className="ml-3 flex-1">
              <Text variant="caption" className="text-ink-3">
                PLAN {plan.weekNumber} · {client.name}
              </Text>
              <Text variant="h2" className="text-ink" numberOfLines={1}>
                Rate each meal
              </Text>
              <Text variant="caption" className="text-ink-2" tabular>
                {plan.calorieRangeLow}–{plan.calorieRangeHigh} kcal/d
              </Text>
            </View>
          </MotiView>

          <View className="flex-row items-baseline justify-between mb-3">
            <Text variant="label" className="text-ink-3">
              CLIENT FEEDBACK · 1–10
            </Text>
            <Text variant="caption" className="text-ink-4" tabular>
              {ratedCount}/{meals.length} rated
            </Text>
          </View>

          <View
            className="rounded-2xl border border-lime/25 bg-lime/[0.05] p-3 flex-row items-center mb-4"
          >
            <Star size={13} color={colors.lime} strokeWidth={2.4} />
            <Text variant="caption" className="text-ink-2 ml-2 flex-1">
              Scores under 4 drop the meal from rotation. 8+ get prioritized for
              similar clients.
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            {meals.map((m, i) => {
              const r = ratings[m.id] ?? null;
              const cue =
                r === null
                  ? null
                  : r < 4
                  ? { text: "Dropped", color: colors.danger }
                  : r >= 8
                  ? { text: "Prioritized", color: colors.lime }
                  : null;
              return (
                <MotiView
                  key={m.id}
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: "spring",
                    damping: 18,
                    stiffness: 200,
                    delay: 80 + i * 40
                  }}
                  className="rounded-2xl border border-line bg-surface p-3.5"
                >
                  <View className="flex-row items-baseline justify-between mb-2">
                    <View className="flex-1 mr-2">
                      <Text variant="caption" className="text-ink-3">
                        {m.slot.toUpperCase()}
                      </Text>
                      <Text variant="h3" className="text-ink" numberOfLines={1}>
                        {m.name}
                      </Text>
                    </View>
                    <View className="items-end">
                      <Text
                        tabular
                        style={{
                          fontFamily: "Inter_700Bold",
                          fontSize: 18,
                          color:
                            r === null
                              ? "#475569"
                              : r < 4
                              ? colors.danger
                              : r >= 8
                              ? colors.lime
                              : colors.warn,
                          letterSpacing: -0.3
                        }}
                      >
                        {r === null ? "—" : r}
                      </Text>
                      {cue ? (
                        <Text
                          variant="caption"
                          style={{
                            color: cue.color,
                            fontFamily: "Inter_600SemiBold",
                            fontSize: 10
                          }}
                        >
                          {cue.text}
                        </Text>
                      ) : (
                        <Text
                          variant="caption"
                          className="text-ink-4"
                          style={{ fontSize: 10 }}
                        >
                          tap to rate
                        </Text>
                      )}
                    </View>
                  </View>
                  <RatingPill
                    value={r}
                    onChange={(v) =>
                      setRatings((prev) => ({ ...prev, [m.id]: v }))
                    }
                  />
                </MotiView>
              );
            })}
          </View>
        </ScrollView>
      </SafeAreaView>

      <BottomBar>
        <Button
          label={done ? "Saved · Returning…" : "Save Ratings"}
          size="lg"
          fullWidth
          disabled={done}
          iconLeft={
            done ? <Check size={16} color="#0A0B0D" strokeWidth={3} /> : null
          }
          onPress={onSave}
        />
      </BottomBar>
    </View>
  );
}
