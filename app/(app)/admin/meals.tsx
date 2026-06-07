import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  FlatList,
  StatusBar,
  Alert,
  RefreshControl,
  ActivityIndicator,
  InteractionManager,
  Pressable as RNPressable
} from "react-native";
import { router } from "expo-router";
import { ArrowLeft, Plus, Edit2, Trash2 } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Button } from "@/components/Button";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Sheet } from "@/components/Sheet";
import { useData } from "@/store/data";
import { colors } from "@/theme/tokens";
import { Meal, MealType } from "@/data/types";
import * as haptics from "@/lib/haptics";

const TAB_OPTIONS: { value: MealType; label: string }[] = [
  { value: "Breakfast", label: "Breakfast" },
  { value: "Lunch / Dinner", label: "Lunch/Dinner" },
  { value: "Snack", label: "Snack" }
];

type MealGroup = {
  mealNumber: number;
  mealName: string;
  brackets: Meal[];
};

// Plain RN Pressable (no Reanimated) + React.memo. The animated custom
// Pressable spins up a shared value + worklet per instance — with ~70 of them
// per tab that was the source of the tab-switch lag. List rows don't need the
// scale animation, so we keep them lightweight here.
const MealGroupRow = React.memo(function MealGroupRow({
  group,
  deletingId,
  onDelete
}: {
  group: MealGroup;
  deletingId: number | null;
  onDelete: (id: number) => void;
}) {
  return (
    <View className="gap-2 mb-4">
      {/* Meal header */}
      <View className="flex-row items-center justify-between px-4 py-2 rounded-lg bg-surface border border-line">
        <View className="flex-1">
          <Text variant="caption" className="text-ink-3 mb-0.5">
            MEAL {group.mealNumber}
          </Text>
          <Text variant="h3" className="text-ink" numberOfLines={1}>
            {group.mealName}
          </Text>
        </View>
        <View className="px-2 py-1 rounded bg-lime/10">
          <Text variant="caption" className="text-lime">
            {group.brackets.length}
          </Text>
        </View>
      </View>

      {/* Bracket cards */}
      <View className="gap-2 pl-4">
        {group.brackets.map((meal) => (
          <RNPressable
            key={meal.id}
            onPress={() => router.push(`/admin/meal-form?id=${meal.id}`)}
            className="flex-row items-center gap-3 p-3 rounded-lg border border-line/50 bg-surface/50 active:bg-surface"
          >
            <View className="flex-1 gap-1">
              <View className="flex-row items-center gap-2">
                <Text variant="caption" className="text-ink-3">
                  {meal.calBracket}
                </Text>
                {meal.rating > 0 && (
                  <Text
                    variant="caption"
                    className="ml-auto"
                    style={{
                      color:
                        meal.rating >= 8
                          ? colors.lime
                          : meal.rating >= 4
                          ? colors.warn
                          : colors.danger
                    }}
                  >
                    ★ {meal.rating}
                  </Text>
                )}
              </View>
              <Text variant="caption" className="text-ink-2" tabular>
                {meal.calories} cal · {meal.proteinG}g P
              </Text>
            </View>

            <View className="flex-row gap-1">
              <RNPressable
                onPress={() => router.push(`/admin/meal-form?id=${meal.id}`)}
                hitSlop={6}
                className="p-2 rounded-full bg-lime/10 active:bg-lime/20"
              >
                <Edit2 size={16} color={colors.lime} strokeWidth={2} />
              </RNPressable>
              <RNPressable
                onPress={() => onDelete(meal.id)}
                disabled={deletingId === meal.id}
                hitSlop={6}
                className="p-2 rounded-full bg-danger/10 active:bg-danger/20"
              >
                <Trash2
                  size={16}
                  color={
                    deletingId === meal.id
                      ? colors.danger + "88"
                      : colors.danger
                  }
                  strokeWidth={2}
                />
              </RNPressable>
            </View>
          </RNPressable>
        ))}
      </View>
    </View>
  );
});

export default function AdminMeals() {
  const insets = useSafeAreaInsets();
  const meals = useData((s) => s.meals);
  const fetchMeals = useData((s) => s.fetchMeals);
  const deleteMeal = useData((s) => s.deleteMeal);

  const [activeTab, setActiveTab] = useState<MealType>("Breakfast");
  const [refreshing, setRefreshing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Render the screen shell (header + tabs + spinner) immediately, then mount
  // the heavy SVG-laden list AFTER the navigation animation settles. This makes
  // opening "Meals Management" feel instant instead of janking the transition.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, []);

  // Fetch once if the store is empty. Otherwise data is already loaded by
  // init() and kept live by the realtime subscription — the list renders
  // immediately from the store, so there's no separate loading screen.
  useEffect(() => {
    if (meals.length === 0) fetchMeals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await fetchMeals();
    } finally {
      setRefreshing(false);
    }
  };

  // Precompute groups for ALL tabs once (only recomputes when meals change).
  // Switching tabs then does zero work — it just indexes into this map, so the
  // tap feels instant instead of re-filtering 54 meals on every switch.
  const groupsByTab = useMemo<Record<string, MealGroup[]>>(() => {
    const out: Record<string, MealGroup[]> = {
      Breakfast: [],
      "Lunch / Dinner": [],
      Snack: []
    };
    const byKey = new Map<string, MealGroup>();
    for (const meal of meals) {
      const key = `${meal.mealType}#${meal.mealNumber}`;
      let group = byKey.get(key);
      if (!group) {
        group = {
          mealNumber: meal.mealNumber,
          mealName: meal.mealName,
          brackets: []
        };
        byKey.set(key, group);
        (out[meal.mealType] ??= []).push(group);
      }
      group.brackets.push(meal);
    }
    for (const k of Object.keys(out)) {
      out[k].sort((a, b) => a.mealNumber - b.mealNumber);
    }
    return out;
  }, [meals]);

  // Deferred tab: the SegmentedControl + spinner react to `activeTab`
  // immediately (urgent), while the heavy list renders against `deferredTab`
  // in a non-blocking concurrent pass. So the tap feels instant and the list
  // streams in a frame later instead of blocking the press.
  const deferredTab = React.useDeferredValue(activeTab);
  const switching = deferredTab !== activeTab;
  const groups = groupsByTab[deferredTab] ?? [];

  const handleDelete = React.useCallback((mealId: number) => {
    setMealToDelete(mealId);
    setDeleteModalVisible(true);
  }, []);

  const confirmDelete = async () => {
    if (!mealToDelete) return;
    try {
      setDeletingId(mealToDelete);
      setDeleteModalVisible(false);
      await deleteMeal(mealToDelete);
      haptics.success();
    } catch (e) {
      haptics.warning();
      Alert.alert("Error", `Failed to delete meal: ${String(e)}`);
    } finally {
      setDeletingId(null);
      setMealToDelete(null);
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
            MEALS DATABASE
          </Text>
          <Pressable
            onPress={() => router.push("/admin/meal-form")}
            className="w-11 h-11 rounded-full border border-lime items-center justify-center bg-lime/10"
          >
            <Plus size={18} color={colors.lime} strokeWidth={2.2} />
          </Pressable>
        </View>

        {/* Top tabs — same SegmentedControl the trainer dashboard uses, so
            switching categories has the same instant, animated feel. */}
        <View className="px-5 mb-3">
          <SegmentedControl<MealType>
            value={activeTab}
            onChange={setActiveTab}
            options={TAB_OPTIONS}
          />
        </View>

        {!ready || switching ? (
          <View className="flex-1 items-center justify-center pb-24">
            <ActivityIndicator color={colors.lime} />
          </View>
        ) : (
          <FlatList
            data={groups}
            keyExtractor={(item) => `${item.mealNumber}-${item.mealName}`}
            renderItem={({ item }) => (
              <MealGroupRow
                group={item}
                deletingId={deletingId}
                onDelete={handleDelete}
              />
            )}
            extraData={deletingId}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingTop: 4,
              paddingBottom: insets.bottom + 100
            }}
            initialNumToRender={3}
            maxToRenderPerBatch={3}
            windowSize={5}
            removeClippedSubviews={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.lime}
              />
            }
            ListEmptyComponent={
              <Text variant="body" className="text-ink-4 text-center py-10">
                No meals in this category
              </Text>
            }
          />
        )}
      </SafeAreaView>

      {/* Delete confirmation */}
      <Sheet
        visible={deleteModalVisible}
        onClose={() => setDeleteModalVisible(false)}
        title="Delete Meal"
        subtitle="This action cannot be undone."
      >
        <View className="gap-3 p-5">
          <Text variant="body" className="text-ink-2">
            Are you sure you want to delete this meal? It will be removed from
            the database and cannot be recovered.
          </Text>
          <View className="gap-3 mt-4">
            <Button
              label="Delete"
              variant="danger"
              fullWidth
              onPress={confirmDelete}
              disabled={deletingId !== null}
            />
            <Button
              label="Cancel"
              variant="ghost"
              fullWidth
              onPress={() => setDeleteModalVisible(false)}
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}
