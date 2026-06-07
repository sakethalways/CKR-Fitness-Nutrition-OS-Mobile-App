import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StatusBar, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import {
  ArrowLeft,
  RefreshCw,
  Check,
  BookmarkPlus
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { Sheet } from "@/components/Sheet";
import { StarRating } from "@/components/StarRating";
import { CalorieRangeBar } from "@/components/CalorieRangeBar";
import { SlotHeader } from "@/components/SlotHeader";
import { MealCard } from "@/components/MealCard";
import { PlanLoadingScreen } from "@/components/PlanLoadingScreen";
import {
  selectClient,
  selectPlan,
  selectTrainer,
  useData
} from "@/store/data";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import { useLibrary } from "@/store/library";
import { seedMeals } from "@/data/meals";
import { mealConflictsWithClient } from "@/lib/allergens";
import { formatDate, planDayState, planDayLabel } from "@/lib/format";
import { Meal } from "@/data/types";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

export default function PlanDetail() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user)!;
  const isAdmin = user.role === "admin";

  const plans = useData((s) => s.plans);
  const dbMeals = useData((s) => s.meals);
  const hasHydrated = useData((s) => s.hasHydrated);
  const updatePlan = useData((s) => s.updatePlan);
  const pushNotification = useNotifications((s) => s.safePush);
  const saveTemplate = useLibrary((s) => s.saveTemplate);

  const plan = useMemo(
    () => (planId ? selectPlan(planId) : undefined),
    [planId]
  );
  const client = useMemo(
    () => (plan ? selectClient(plan.clientId) : undefined),
    [plan]
  );
  const trainer = useMemo(
    () => (client ? selectTrainer(client.trainerId) : undefined),
    [client]
  );

  // Working copy of meal IDs — diverges from plan.selectedMealIds when admin
  // swaps. Normalized to strings because the DB column is text[]; keeping a
  // single id type here is what makes swap + dirty-detection work.
  const [draftIds, setDraftIds] = useState<string[]>(
    (plan?.selectedMealIds ?? []).map(String)
  );
  const [swapForSlot, setSwapForSlot] = useState<string | null>(null);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);

  // If the plan loads AFTER first render (cold load / deep link), seed the
  // working copy once. Guarded on empty so it never clobbers in-progress swaps.
  useEffect(() => {
    const ids = plan?.selectedMealIds;
    if (ids && ids.length > 0 && draftIds.length === 0) {
      setDraftIds(ids.map(String));
    }
  }, [plan?.selectedMealIds, draftIds.length]);

  const meals = useMemo(
    () =>
      draftIds
        .map((id) => {
          // Try to find in database meals first (by string id), then in seedMeals (by number)
          const numId = Number(id);
          return dbMeals.find((m) => m.id === numId) ?? seedMeals.find((m) => m.id === numId);
        })
        .filter((m): m is Meal => Boolean(m)),
    [draftIds, dbMeals]
  );

  const slots = useMemo(
    () => {
      const breakfast = meals.filter((m) => m.mealType === "Breakfast");
      const lunchDinner = meals.filter((m) => m.mealType === "Lunch / Dinner");
      const snack = meals.filter((m) => m.mealType === "Snack");
      return [
        { slot: "Breakfast", meals: breakfast },
        { slot: "Lunch", meals: lunchDinner.slice(0, Math.ceil(lunchDinner.length / 2)) },
        { slot: "Dinner", meals: lunchDinner.slice(Math.ceil(lunchDinner.length / 2)) },
        { slot: "Snack", meals: snack },
      ].filter((s) => s.meals.length > 0);
    },
    [meals]
  );

  const dirty = useMemo(() => {
    const a = (plan?.selectedMealIds ?? []).map(String).sort().join("|");
    const b = draftIds.slice().sort().join("|");
    return a !== b;
  }, [plan?.selectedMealIds, draftIds]);

  // Alternative meals for the slot being swapped (allergen + food-pref filtered)
  const swapCandidates: Meal[] = useMemo(() => {
    if (!swapForSlot || !client) return [];
    const wantsVegOnly = client.foodPref === "Veg";
    const inUse = new Set(draftIds.map(Number));

    const mealType =
      swapForSlot === "Breakfast"
        ? "Breakfast"
        : swapForSlot === "Snack"
        ? "Snack"
        : "Lunch / Dinner";
    // Use database meals first, fall back to seedMeals
    const availableMeals = dbMeals.length > 0 ? dbMeals : seedMeals;
    return availableMeals.filter((m) => {
      if (m.mealType !== mealType) return false;
      if (inUse.has(m.id) && String(m.id) !== swapTargetId) return false; // skip already-picked
      if (wantsVegOnly && m.diet === "Non-Veg") return false;
      // Reliable structured allergen check (set-intersection).
      if (mealConflictsWithClient(m.allergens, client.allergens)) return false;
      return true;
    });
  }, [swapForSlot, draftIds, swapTargetId, client, dbMeals]);

  // --- All hooks above this line always run (no conditional hooks) ---

  // Data not ready yet → show the branded loader instead of a "not found"
  // flash while the store hydrates.
  if (!hasHydrated && (!plan || !client)) {
    return <PlanLoadingScreen title="Loading plan" subtitle="Fetching meals…" />;
  }

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

  // Older seed plans may not carry meal IDs — friendly empty state.
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
              Plan details
            </Text>
          </View>
          <View className="rounded-2xl border border-line bg-surface p-5">
            <Text variant="h3" className="text-ink mb-2">
              No meal selections attached
            </Text>
            <Text variant="body" className="text-ink-2">
              This plan was created before meal tracking. Newer plans will show
              the full meal breakdown here.
            </Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const onSwap = (oldMealId: string, newMealId: string) => {
    setDraftIds((prev) => prev.map((id) => (id === oldMealId ? newMealId : id)));
    setSwapForSlot(null);
    setSwapTargetId(null);
    haptics.success();
  };

  const onSaveChanges = async () => {
    try {
      await updatePlan(plan.id, { selectedMealIds: draftIds });

      if (isAdmin) {
        // Admin edit: close any pending change request + notify the trainer.
        const sourceRequest = useNotifications
          .getState()
          .items.find(
            (n) =>
              n.recipientRole === "admin" &&
              n.kind === "plan_change_request" &&
              n.payload.planId === plan.id
          );
        if (sourceRequest) {
          await useNotifications.getState().safeUpdate(sourceRequest.id, {
            kind: "admin_changed_plan",
            title: "Plan change completed",
            body: `Updated Plan ${plan.weekNumber} for ${client.name}.`,
            isRead: true
          });
        }
        if (client.trainerId) {
          await pushNotification({
            recipientRole: "trainer",
            recipientId: client.trainerId,
            kind: "admin_changed_plan",
            title: "Plan updated by admin",
            body: `Admin swapped meals in Plan ${plan.weekNumber} for ${client.name}.`,
            payload: {
              clientId: client.id,
              planId: plan.id,
              trainerId: client.trainerId
            }
          });
        }
        haptics.success();
        Alert.alert("Saved", "Plan updated. Trainer has been notified.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      } else {
        // Trainer edited their own client's plan — saves directly.
        haptics.success();
        Alert.alert("Saved", "Plan updated.", [
          { text: "OK", onPress: () => router.back() }
        ]);
      }
    } catch (e: any) {
      haptics.warning();
      Alert.alert("Couldn't save changes", e?.message ?? String(e));
    }
  };

  const onSaveToLibrary = async () => {
    if (!plan.selectedMealIds || plan.selectedMealIds.length === 0) return;
    if (!isAdmin) return;
    try {
      await saveTemplate({
        name: `${client.goal} · ${plan.calorieRangeLow}–${plan.calorieRangeHigh} kcal`,
        sourcePlanId: plan.id,
        sourceClientName: client.name,
        savedByAdminId: user.admin.id,
        selectedMealIds: plan.selectedMealIds.map(String),
        calorieRangeLow: plan.calorieRangeLow,
        calorieRangeHigh: plan.calorieRangeHigh,
        tagSummary: `${client.goal} · ${client.foodPref} · ${client.clientTypes.join(" / ")}`
      });
      haptics.success();
      Alert.alert("Saved", "Plan added to the library template.");
    } catch (e: any) {
      haptics.warning();
      Alert.alert("Couldn't save", e?.message ?? String(e));
    }
  };

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
            PLAN {plan.weekNumber}
          </Text>
          {isAdmin && plan.avgRating >= 8 ? (
            <Pressable
              onPress={onSaveToLibrary}
              haptic="light"
              className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03]"
            >
              <BookmarkPlus size={16} color={colors.lime} strokeWidth={2.2} />
            </Pressable>
          ) : (
            <View className="w-11 h-11" />
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            // Reserve space for the save bar (both roles can edit now).
            paddingBottom: insets.bottom + 120
          }}
        >
          {/* Client + plan header */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="flex-row items-center mb-4"
          >
            <Avatar initials={client.initials} size={44} tone="lime" />
            <View className="ml-3 flex-1">
              <Text variant="caption" className="text-ink-3">
                PLAN FOR
              </Text>
              <Text variant="h2" className="text-ink" numberOfLines={1}>
                {client.name}
              </Text>
              <Text variant="caption" className="text-ink-2">
                Plan {plan.weekNumber} ·{" "}
                {plan.status === "active" ? "Active" : "Past"}
                {isAdmin && trainer ? ` · by ${trainer.name.split(" ")[0]}` : ""}
              </Text>
              <Text variant="caption" className="text-ink-4 mt-0.5" tabular>
                Created {formatDate(plan.createdAt)}
              </Text>
            </View>
            {plan.avgRating > 0 ? (
              <View className="ml-2">
                <StarRating value={plan.avgRating} />
              </View>
            ) : null}
          </MotiView>

          {/* Day tracker pill */}
          {(() => {
            const ds = planDayState({
              createdAt: plan.createdAt,
              planStatus: plan.status,
              clientStatus: client.status
            });
            const tint =
              ds.kind === "reached"
                ? colors.success
                : ds.kind === "extend"
                ? colors.warn
                : ds.kind === "ended"
                ? colors.ink3
                : colors.lime;
            return (
              <View
                className="self-start mb-3 px-3 py-1.5 rounded-full border flex-row items-center"
                style={{
                  borderColor: `${tint}55`,
                  backgroundColor: `${tint}14`
                }}
              >
                <View
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: 3,
                    backgroundColor: tint,
                    marginRight: 6
                  }}
                />
                <Text
                  variant="caption"
                  style={{ color: tint, fontFamily: "Inter_600SemiBold" }}
                >
                  {planDayLabel(ds)}
                </Text>
              </View>
            );
          })()}

          {/* Calorie range */}
          <CalorieRangeBar
            target={client.calorieTarget ?? plan.calorieRangeLow}
            low={plan.calorieRangeLow}
            high={plan.calorieRangeHigh}
          />

          {/* Slots */}
          {slots.map((s, slotIdx) => (
            <React.Fragment key={s.slot}>
              <SlotHeader
                slot={s.slot}
                targetKcal={Math.round(
                  ((client.calorieTarget ?? plan.calorieRangeLow) *
                    (s.slot === "Breakfast"
                      ? 0.25
                      : s.slot === "Lunch"
                      ? 0.35
                      : s.slot === "Dinner"
                      ? 0.3
                      : 0.1))
                )}
                count={s.meals.length}
              />
              <View style={{ gap: 8 }}>
                {s.meals.map((m, i) => (
                  <View key={m.id}>
                    <MealCard meal={m} delay={slotIdx * 24 + i * 12} />
                    {/* Both admin and the owning trainer can swap meals. */}
                    <View className="flex-row mt-2">
                      <Pressable
                        onPress={() => {
                          setSwapTargetId(String(m.id));
                          setSwapForSlot(s.slot);
                        }}
                        haptic="light"
                        scaleTo={0.97}
                        className="flex-row items-center px-3 h-8 rounded-full border border-line-strong bg-white/[0.04]"
                      >
                        <RefreshCw
                          size={11}
                          color={colors.ink2}
                          strokeWidth={2.4}
                        />
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

      {/* Save bar — shown to whoever edited (admin or owning trainer). */}
      {dirty ? (
        <BottomBar>
          <Button
            label={isAdmin ? "Save Changes & Notify Trainer" : "Save Changes"}
            size="lg"
            fullWidth
            iconLeft={<Check size={16} color="#0A0B0D" strokeWidth={3} />}
            onPress={onSaveChanges}
          />
        </BottomBar>
      ) : null}

      {/* Swap sheet */}
      <Sheet
        visible={swapForSlot !== null}
        onClose={() => {
          setSwapForSlot(null);
          setSwapTargetId(null);
        }}
        title={swapForSlot ? `Swap ${swapForSlot}` : ""}
        subtitle={`Filtered for ${client.foodPref}${
          client.allergens.length && client.allergens[0] !== "None"
            ? ` · avoiding ${client.allergens.join(", ")}`
            : ""
        }`}
        compact={false}
      >
        <ScrollView
          style={{ maxHeight: 460 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 8, paddingBottom: 16 }}>
            {swapCandidates.length === 0 ? (
              <Text variant="body" className="text-ink-3 text-center mt-3">
                No alternative meals available for this slot.
              </Text>
            ) : (
              swapCandidates.map((alt) => {
                const isCurrent = String(alt.id) === swapTargetId;
                return (
                  <Pressable
                    key={alt.id}
                    onPress={() =>
                      swapTargetId && onSwap(swapTargetId, String(alt.id))
                    }
                    haptic="light"
                    scaleTo={0.98}
                    disabled={isCurrent}
                    className={`rounded-2xl border p-3 ${
                      isCurrent
                        ? "border-lime/40 bg-lime/[0.06]"
                        : "border-line bg-surface"
                    }`}
                  >
                    <View className="flex-row items-start">
                      <View className="flex-1 mr-2">
                        <Text
                          variant="bodyMedium"
                          className="text-ink"
                          numberOfLines={1}
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {alt.mealName}
                        </Text>
                        <Text
                          variant="caption"
                          className="text-ink-3 mt-0.5"
                          tabular
                        >
                          {alt.calories} kcal · P{Math.round(alt.proteinG)} C{Math.round(alt.carbsG)} F
                          {Math.round(alt.fatG)}
                        </Text>
                      </View>
                      {isCurrent ? (
                        <View className="px-2 py-0.5 rounded-md bg-lime/15 border border-lime/30">
                          <Text
                            variant="caption"
                            className="text-lime"
                            style={{ fontSize: 10 }}
                          >
                            current
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </Sheet>
    </View>
  );
}
