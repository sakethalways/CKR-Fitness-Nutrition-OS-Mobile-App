import React, { useMemo, useState } from "react";
import { View, ScrollView, StatusBar, Alert, Dimensions } from "react-native";
import { router, useFocusEffect } from "expo-router";
import { MotiView } from "moti";
import {
  ArrowLeft,
  Plus,
  Edit2,
  Trash2,
  CheckCircle
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { Sheet } from "@/components/Sheet";
import { useData } from "@/store/data";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

const MEAL_SECTIONS = ["Breakfast", "Lunch / Dinner", "Snack"] as const;

export default function AdminMeals() {
  const insets = useSafeAreaInsets();
  const meals = useData((s) => s.meals);
  const fetchMeals = useData((s) => s.fetchMeals);
  const deleteMeal = useData((s) => s.deleteMeal);

  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [mealToDelete, setMealToDelete] = useState<number | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  // Load meals on focus
  useFocusEffect(
    React.useCallback(() => {
      fetchMeals();
    }, [fetchMeals])
  );

  // Group meals by type and meal number
  const groupedMeals = useMemo(() => {
    const grouped: Record<string, Record<number, any[]>> = {};

    MEAL_SECTIONS.forEach((section) => {
      grouped[section] = {};
      const sectionMeals = meals.filter((m) => m.mealType === section);
      sectionMeals.forEach((meal) => {
        if (!grouped[section][meal.mealNumber]) {
          grouped[section][meal.mealNumber] = [];
        }
        grouped[section][meal.mealNumber].push(meal);
      });
    });

    return grouped;
  }, [meals]);

  const handleDelete = async (mealId: number) => {
    setMealToDelete(mealId);
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!mealToDelete) return;

    try {
      setDeletingId(mealToDelete);
      setDeleteModalVisible(false);
      await deleteMeal(mealToDelete);
      haptics.success();
      Alert.alert("Success", "Meal deleted successfully");
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

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 100
          }}
        >
          {MEAL_SECTIONS.map((section, sectionIdx) => {
            const mealsByNumber = groupedMeals[section] || {};
            const mealNumbers = Object.keys(mealsByNumber)
              .map(Number)
              .sort((a, b) => a - b);

            return (
              <MotiView
                key={section}
                from={{ opacity: 0, translateY: 10 }}
                animate={{ opacity: 1, translateY: 0 }}
                transition={{
                  type: "spring",
                  damping: 18,
                  stiffness: 200,
                  delay: sectionIdx * 100
                }}
                className="mb-6"
              >
                <Text variant="label" className="text-ink-3 mb-3">
                  {section.toUpperCase()}
                </Text>

                <View className="gap-4">
                  {mealNumbers.length === 0 ? (
                    <Text variant="body" className="text-ink-4 text-center py-4">
                      No meals in this category
                    </Text>
                  ) : (
                    mealNumbers.map((mealNumber) => {
                      const brackets = mealsByNumber[mealNumber] || [];
                      const firstMeal = brackets[0];

                      return (
                        <View key={mealNumber} className="gap-2 mb-2">
                          {/* Meal Header */}
                          <View className="flex-row items-center justify-between px-4 py-2 rounded-lg bg-surface border border-line">
                            <View className="flex-1">
                              <Text variant="caption" className="text-ink-3 mb-0.5">
                                MEAL {mealNumber}
                              </Text>
                              <Text variant="h3" className="text-ink" numberOfLines={1}>
                                {firstMeal.mealName}
                              </Text>
                            </View>
                            <View className="flex-row items-center gap-1">
                              <View className="px-2 py-1 rounded bg-lime/10">
                                <Text variant="caption" className="text-lime">
                                  {brackets.length}
                                </Text>
                              </View>
                            </View>
                          </View>

                          {/* Bracket Cards */}
                          <View className="gap-2 pl-4">
                            {brackets.map((meal) => (
                              <MotiView
                                key={meal.id}
                                from={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{
                                  type: "spring",
                                  damping: 18,
                                  stiffness: 200
                                }}
                              >
                                <Pressable
                                  onPress={() =>
                                    router.push(`/admin/meal-form?id=${meal.id}`)
                                  }
                                  className="flex-row items-center gap-3 p-3 rounded-lg border border-line/50 bg-surface/50 active:bg-surface"
                                >
                                  <View className="flex-1 gap-1">
                                    <View className="flex-row items-center gap-2">
                                      <Text variant="caption" className="text-ink-3">
                                        {meal.calBracket}
                                      </Text>
                                      {meal.isShootPriority && (
                                        <View className="px-1.5 py-0.5 rounded-full bg-orange/10">
                                          <Text
                                            variant="caption"
                                            className="text-orange text-xs"
                                          >
                                            SHOOT
                                          </Text>
                                        </View>
                                      )}
                                      {meal.rating > 0 && (
                                        <View className="flex-row items-center gap-0.5 ml-auto">
                                          <Text
                                            variant="caption"
                                            className="text-ink-2"
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
                                        </View>
                                      )}
                                    </View>
                                    <View className="flex-row items-center gap-2">
                                      <Text
                                        variant="caption"
                                        className="text-ink-2"
                                        tabular
                                      >
                                        {meal.calories} cal · {meal.proteinG}g P
                                      </Text>
                                    </View>
                                  </View>

                                  <View className="flex-row gap-1">
                                    <Pressable
                                      onPress={() =>
                                        router.push(`/admin/meal-form?id=${meal.id}`)
                                      }
                                      className="p-2 rounded-full bg-lime/10 active:bg-lime/20"
                                    >
                                      <Edit2
                                        size={16}
                                        color={colors.lime}
                                        strokeWidth={2}
                                      />
                                    </Pressable>
                                    <Pressable
                                      onPress={() => handleDelete(meal.id)}
                                      disabled={deletingId === meal.id}
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
                                    </Pressable>
                                  </View>
                                </Pressable>
                              </MotiView>
                            ))}
                          </View>
                        </View>
                      );
                    })
                  )}
                </View>
              </MotiView>
            );
          })}
        </ScrollView>
      </SafeAreaView>

      {/* Delete Confirmation Modal */}
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
          <View className="flex-row gap-3 mt-4">
            <Button
              label="Cancel"
              variant="ghost"
              fullWidth
              onPress={() => setDeleteModalVisible(false)}
            />
            <Button
              label="Delete"
              variant="primary"
              fullWidth
              tone="danger"
              onPress={confirmDelete}
              disabled={deletingId !== null}
            />
          </View>
        </View>
      </Sheet>
    </View>
  );
}
