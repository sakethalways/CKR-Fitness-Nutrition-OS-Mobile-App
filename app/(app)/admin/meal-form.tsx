import React, { useState, useEffect, useMemo } from "react";
import {
  View,
  ScrollView,
  StatusBar,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  InteractionManager
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft, Trash2 } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { Sheet } from "@/components/Sheet";
import { MealForm, MealFormData } from "@/components/MealForm";
import { PlanLoadingScreen } from "@/components/PlanLoadingScreen";
import { useData } from "@/store/data";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

export default function MealFormScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const meals = useData((s) => s.meals);
  const hasHydrated = useData((s) => s.hasHydrated);
  const addMeal = useData((s) => s.addMeal);
  const updateMeal = useData((s) => s.updateMeal);
  const deleteMeal = useData((s) => s.deleteMeal);

  const [loading, setLoading] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Show the screen shell (header) + spinner immediately, then mount the heavy
  // form AFTER the navigation animation settles — so tapping a meal opens
  // smoothly instead of janking / flashing the previous screen.
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => setReady(true));
    return () => task.cancel();
  }, []);

  // Find meal if editing
  const meal = useMemo(
    () => (id ? meals.find((m) => m.id === Number(id)) : undefined),
    [id, meals]
  );

  const isEditMode = !!meal;

  // Editing a meal but the store hasn't hydrated yet → show a loader instead
  // of briefly flashing a blank "ADD MEAL" form.
  if (id && !meal && !hasHydrated) {
    return <PlanLoadingScreen title="Loading meal" subtitle="Fetching details…" />;
  }

  const handleCancel = () => {
    if (isDirty) {
      Alert.alert("Discard Changes?", "You have unsaved changes.", [
        { text: "Cancel", style: "cancel" },
        {
          text: "Discard",
          style: "destructive",
          onPress: () => router.back()
        }
      ]);
    } else {
      router.back();
    }
  };

  const handleSubmit = async (data: MealFormData) => {
    setLoading(true);
    try {
      if (isEditMode) {
        await updateMeal(meal.id, data);
        haptics.success();
        Alert.alert("Success", "Meal updated successfully", [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]);
      } else {
        await addMeal(data);
        haptics.success();
        Alert.alert("Success", "Meal added successfully", [
          {
            text: "OK",
            onPress: () => router.back()
          }
        ]);
      }
    } catch (e) {
      haptics.warning();
      Alert.alert(
        "Error",
        `Failed to save meal: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = () => {
    setDeleteModalVisible(true);
  };

  const confirmDelete = async () => {
    if (!meal) return;

    try {
      setDeleteModalVisible(false);
      setLoading(true);
      await deleteMeal(meal.id);
      haptics.success();
      Alert.alert("Success", "Meal deleted successfully", [
        {
          text: "OK",
          onPress: () => router.back()
        }
      ]);
    } catch (e) {
      haptics.warning();
      Alert.alert(
        "Error",
        `Failed to delete meal: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      className="flex-1 bg-bg"
    >
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#11160B", "#0A0B0D", "#0A0B0D"]}
        locations={[0, 0.4, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        <View className="flex-row items-center justify-between px-5 mt-2 mb-3">
          <Pressable
            onPress={handleCancel}
            className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03]"
          >
            <ArrowLeft size={18} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <Text variant="label" className="text-ink-3">
            {isEditMode ? "EDIT MEAL" : "ADD MEAL"}
          </Text>
          {isEditMode ? (
            <Pressable
              onPress={handleDelete}
              disabled={loading}
              haptic="light"
              scaleTo={0.96}
              className="flex-row items-center px-3 h-9 rounded-full border border-danger/40 bg-danger/15"
            >
              <Trash2 size={13} color={colors.danger} strokeWidth={2.2} />
              <Text
                variant="caption"
                className="text-danger ml-1.5"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Delete
              </Text>
            </Pressable>
          ) : (
            <View className="w-11" />
          )}
        </View>

        {!ready ? (
          <View className="flex-1 items-center justify-center pb-24">
            <ActivityIndicator color={colors.lime} />
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 120
            }}
          >
            <MealForm
              initialMeal={meal}
              onSubmit={handleSubmit}
              isLoading={loading}
            />
          </ScrollView>
        )}

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
            Are you sure you want to delete "{meal?.mealName}"? It will be
            removed from the database and cannot be recovered.
          </Text>
          <View className="gap-3 mt-4">
            <Button
              label="Delete"
              variant="danger"
              fullWidth
              onPress={confirmDelete}
              disabled={loading}
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
    </KeyboardAvoidingView>
  );
}
