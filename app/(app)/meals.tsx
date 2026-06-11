import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StatusBar } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import { ArrowLeft, RefreshCw } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { Sheet } from "@/components/Sheet";
import { CalorieRangeBar } from "@/components/CalorieRangeBar";
import { SlotHeader } from "@/components/SlotHeader";
import { MealCard } from "@/components/MealCard";
import { PlanLoadingScreen } from "@/components/PlanLoadingScreen";
import { useData } from "@/store/data";
import { generateForClient, GenerationResult } from "@/lib/mealGenerator";
import { mealConflictsWithClient } from "@/lib/allergens";
import { Meal } from "@/data/types";
import { genderLabel } from "@/lib/format";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";
import { friendlyError } from "@/lib/errors";

// Recompute the plan's totals after a swap.
const recomputeTotals = (slots: GenerationResult["slots"]) => {
  let low = 0;
  let high = 0;
  let pLow = 0;
  let pHigh = 0;
  for (const s of slots) {
    const cals = s.meals.map((m) => m.calories);
    const prots = s.meals.map((m) => m.proteinG);
    if (cals.length) {
      low += Math.min(...cals);
      high += Math.max(...cals);
      pLow += Math.min(...prots);
      pHigh += Math.max(...prots);
    }
  }
  return {
    flatMeals: slots.flatMap((s) => s.meals),
    rangeLow: low,
    rangeHigh: high,
    proteinLow: Math.round(pLow),
    proteinHigh: Math.round(pHigh)
  };
};

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

  // Swap-before-approve: which meal (slot + meal) is being swapped.
  const [swap, setSwap] = useState<{ slotIdx: number; meal: Meal } | null>(null);
  const dbMeals = useData((s) => s.meals);

  // Alternatives for the meal being swapped: same slot type, SAME calorie
  // bracket (keeps the plan within range), diet/allergen-safe, not already
  // in the plan.
  const swapCandidates = useMemo<Meal[]>(() => {
    if (!swap || !client || !generated) return [];
    const slotLabel = generated.slots[swap.slotIdx]?.slot;
    const slotType =
      slotLabel === "Breakfast"
        ? "Breakfast"
        : slotLabel === "Snack"
        ? "Snack"
        : "Lunch / Dinner";
    const inUse = new Set(generated.flatMeals.map((m) => m.id));
    const vegOnly = client.foodPref === "Veg";
    return dbMeals.filter(
      (m) =>
        m.mealType === slotType &&
        m.calBracket === swap.meal.calBracket &&
        m.id !== swap.meal.id &&
        !inUse.has(m.id) &&
        !(vegOnly && m.diet === "Non-Veg") &&
        !mealConflictsWithClient(m.allergens, client.allergens)
    );
  }, [swap, client, generated, dbMeals]);

  const doSwap = (newMeal: Meal) => {
    if (!swap) return;
    setGenerated((prev) => {
      if (!prev) return prev;
      const slots = prev.slots.map((s, idx) =>
        idx === swap.slotIdx
          ? {
              ...s,
              meals: s.meals.map((mm) =>
                mm.id === swap.meal.id ? newMeal : mm
              )
            }
          : s
      );
      return { ...prev, slots, ...recomputeTotals(slots) };
    });
    setSwap(null);
    haptics.success();
  };

  useEffect(() => {
    if (!client || generated) return;
    try {
      const { plans, meals } = useData.getState();
      const priorPlans = plans
        .filter((p) => p.clientId === client.id)
        .sort((a, b) => b.weekNumber - a.weekNumber);
      const gen = generateForClient(client, priorPlans, meals);
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
      Alert.alert("Couldn't save plan", friendlyError(e));
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

          {(() => {
            const target = client.calorieTarget ?? 0;
            const underTarget = target > 0 && generated.rangeHigh < target * 0.9;
            if (generated.missingSlots.length === 0 && !underTarget) return null;
            const avoided = client.allergens.filter((a) => a !== "None");
            return (
              <View className="mt-4 rounded-xl border border-warn/30 bg-warn/[0.06] px-3 py-2.5">
                <Text
                  variant="caption"
                  className="text-warn"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {generated.missingSlots.length > 0
                    ? `Limited options — no ${generated.missingSlots.join(" / ")} fit this client`
                    : "Plan is under target"}
                </Text>
                <Text
                  variant="caption"
                  className="text-ink-3 mt-0.5"
                  style={{ lineHeight: 16 }}
                >
                  This plan delivers ~{generated.rangeLow}
                  {generated.rangeHigh !== generated.rangeLow
                    ? `–${generated.rangeHigh}`
                    : ""}{" "}
                  kcal vs a {target} kcal target. Too few meals match
                  {client.foodPref === "Veg" ? " their veg preference" : ""}
                  {avoided.length
                    ? `${client.foodPref === "Veg" ? " and" : ""} their allergens (${avoided.join(", ")})`
                    : ""}
                  . Add more suitable meals to the catalogue to build a complete plan.
                </Text>
              </View>
            );
          })()}

          {(() => {
            const pTarget = client.proteinTarget ?? 0;
            // Best case: client picks the highest-protein option in each slot.
            if (pTarget <= 0 || generated.proteinHigh >= pTarget * 0.9) return null;
            return (
              <View className="mt-3 rounded-xl border border-info/30 bg-info/[0.06] px-3 py-2.5">
                <Text
                  variant="caption"
                  className="text-info"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Protein runs below target
                </Text>
                <Text
                  variant="caption"
                  className="text-ink-3 mt-0.5"
                  style={{ lineHeight: 16 }}
                >
                  This plan tops out around {generated.proteinHigh}g protein vs a{" "}
                  {pTarget}g target. Add a higher-protein meal (or a protein
                  snack) to close the gap.
                </Text>
              </View>
            );
          })()}

          {generated.slots.map((s, slotIdx) => (
            <React.Fragment key={s.slot}>
              <SlotHeader
                slot={s.slot}
                targetKcal={s.targetKcal}
                count={s.meals.length}
              />
              <View style={{ gap: 8 }}>
                {s.meals.map((m, i) => (
                  <View key={m.id}>
                    <MealCard meal={m} delay={200 + slotIdx * 80 + i * 40} />
                    <View className="flex-row mt-2">
                      <Pressable
                        onPress={() => setSwap({ slotIdx, meal: m })}
                        haptic="light"
                        scaleTo={0.97}
                        className="flex-row items-center px-3 h-8 rounded-full border border-line-strong bg-white/[0.04]"
                      >
                        <RefreshCw size={11} color={colors.ink2} strokeWidth={2.4} />
                        <Text
                          variant="caption"
                          className="text-ink-2 ml-1.5"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          Swap this meal
                        </Text>
                      </Pressable>
                    </View>
                  </View>
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

      {/* Swap sheet — alternatives within the same calorie bracket */}
      <Sheet
        visible={swap !== null}
        onClose={() => setSwap(null)}
        title={swap ? `Swap ${generated.slots[swap.slotIdx]?.slot}` : ""}
        subtitle={
          swap
            ? `${swap.meal.calBracket} · keeps the plan within range`
            : undefined
        }
        compact={false}
      >
        <ScrollView style={{ maxHeight: 460 }} showsVerticalScrollIndicator={false}>
          <View style={{ gap: 8, paddingBottom: 16 }}>
            {swapCandidates.length === 0 ? (
              <Text variant="body" className="text-ink-3 text-center mt-3">
                No other meals in this calorie bracket fit this client.
              </Text>
            ) : (
              swapCandidates.map((alt) => (
                <Pressable
                  key={alt.id}
                  onPress={() => doSwap(alt)}
                  haptic="light"
                  scaleTo={0.98}
                  className="rounded-2xl border border-line bg-surface p-3"
                >
                  <Text
                    variant="bodyMedium"
                    className="text-ink"
                    numberOfLines={1}
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {alt.mealName}
                  </Text>
                  <Text variant="caption" className="text-ink-3 mt-0.5" tabular>
                    {alt.calories} kcal · P{Math.round(alt.proteinG)} C
                    {Math.round(alt.carbsG)} F{Math.round(alt.fatG)}
                  </Text>
                </Pressable>
              ))
            )}
          </View>
        </ScrollView>
      </Sheet>
    </View>
  );
}
