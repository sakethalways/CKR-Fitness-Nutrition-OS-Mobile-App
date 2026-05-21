import React, { useEffect, useState } from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { CalorieRangeBar } from "@/components/CalorieRangeBar";
import { SlotHeader } from "@/components/SlotHeader";
import { MealCard } from "@/components/MealCard";
import { PlanLoadingScreen } from "@/components/PlanLoadingScreen";
import { useData } from "@/store/data";
import { generateForClient, GenerationResult } from "@/lib/mealGenerator";
import { genderLabel } from "@/lib/format";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

const LOADING_DURATION_MS = 1800;

export default function MealsScreen() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const insets = useSafeAreaInsets();
  const addPlan = useData((s) => s.addPlan);

  // Reactive selector for the client (so target edits flow in if they happen)
  const client = useData((s) =>
    clientId ? s.clients.find((c) => c.id === clientId) : undefined
  );

  // Generation result held entirely in local state — the plan is NOT
  // persisted until the trainer taps "Approve & Export". This means
  // regenerating or backing out doesn't waste a week number.
  const [generated, setGenerated] = useState<GenerationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [approving, setApproving] = useState(false);
  // UX delay so the trainer sees the loading screen + fitness quote
  const [showLoading, setShowLoading] = useState(true);

  useEffect(() => {
    if (!client || generated) return;
    try {
      const priorPlans = useData
        .getState()
        .plans.filter((p) => p.clientId === client.id)
        .sort((a, b) => b.weekNumber - a.weekNumber);
      const gen = generateForClient(client, priorPlans);
      setGenerated(gen);
    } catch (e: any) {
      setError(e?.message ?? "Could not generate meal options");
    }
  }, [client, generated]);

  // Hold the loading screen for a beat regardless of how fast generation
  // finishes — gives the trainer a chance to read the quote.
  useEffect(() => {
    const t = setTimeout(() => setShowLoading(false), LOADING_DURATION_MS);
    return () => clearTimeout(t);
  }, []);

  const onApprove = async () => {
    if (!client || !generated || approving) return;
    setApproving(true);
    try {
      const priorPlans = useData
        .getState()
        .plans.filter((p) => p.clientId === client.id)
        .sort((a, b) => b.weekNumber - a.weekNumber);
      const nextWeek = (priorPlans[0]?.weekNumber ?? 0) + 1 || 1;
      const created = await addPlan({
        clientId: client.id,
        weekNumber: nextWeek,
        calorieRangeLow: generated.rangeLow,
        calorieRangeHigh: generated.rangeHigh,
        status: "active",
        avgRating: 0,
        createdAt: new Date().toISOString(),
        selectedMealIds: generated.flatMeals.map((m) => m.id)
      });
      haptics.success();
      router.push(`/(app)/approve?planId=${created.id}`);
    } catch (e: any) {
      haptics.warning();
      setApproving(false);
      const { Alert } = await import("react-native");
      Alert.alert("Couldn't save plan", e?.message ?? String(e));
    }
  };

  if (!client) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text variant="body" className="text-ink-2 text-center mb-4">
          Client not found.
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  if (error) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text variant="body" className="text-danger text-center mb-4">
          {error}
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  if (showLoading || !generated) {
    return (
      <PlanLoadingScreen
        title="Generating meal options"
        subtitle={`Tailoring 8 picks for ${client.name.split(" ")[0]}…`}
      />
    );
  }

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
            PREVIEW
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
                PLAN PREVIEW FOR
              </Text>
              <Text variant="h2" className="text-ink" numberOfLines={1}>
                {client.name}
              </Text>
              <Text variant="caption" className="text-ink-2" tabular>
                {client.age}y · {genderLabel(client.gender)} ·{" "}
                {client.calorieTarget} kcal · {client.goal}
              </Text>
            </View>
          </MotiView>

          {/* Draft notice — explicit that nothing's saved yet */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 240, delay: 60 }}
            className="rounded-xl border border-line bg-white/[0.02] px-3 py-2 mb-4"
          >
            <Text variant="caption" className="text-ink-3">
              Draft · not saved yet. Approve & Export to lock this in as the
              next week.
            </Text>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 18,
              stiffness: 200,
              delay: 80
            }}
          >
            <CalorieRangeBar
              target={client.calorieTarget!}
              low={generated.rangeLow}
              high={generated.rangeHigh}
            />
          </MotiView>

          {generated.slots.map((s, slotIdx) => (
            <React.Fragment key={s.slot}>
              <SlotHeader
                slot={s.slot}
                targetKcal={s.targetKcal}
                count={s.meals.length}
              />
              <View style={{ gap: 8 }}>
                {s.meals.map((m, i) => (
                  <MealCard
                    key={m.id}
                    meal={m}
                    delay={200 + slotIdx * 80 + i * 40}
                  />
                ))}
              </View>
            </React.Fragment>
          ))}
        </ScrollView>
      </SafeAreaView>

      <BottomBar>
        <Button
          label={approving ? "Saving…" : "Approve & Export"}
          size="lg"
          fullWidth
          loading={approving}
          onPress={onApprove}
        />
      </BottomBar>
    </View>
  );
}
