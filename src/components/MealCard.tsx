import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { Star, Leaf, Drumstick } from "lucide-react-native";
import { Text } from "./Text";
import { Meal } from "@/data/types";
import { colors } from "@/theme/tokens";

type Props = {
  meal: Meal;
  delay?: number;
};

export function MealCard({ meal, delay = 0 }: Props) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 12, scale: 0.98 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 180, delay }}
      className="rounded-2xl border border-line bg-surface p-3.5"
    >
      <View className="flex-row items-start">
        <View className="flex-1 mr-3">
          <View className="flex-row items-center mb-1">
            {meal.diet === "Veg" ? (
              <Leaf size={11} color={colors.success} strokeWidth={2.4} />
            ) : (
              <Drumstick size={11} color="#F97316" strokeWidth={2.4} />
            )}
            <Text variant="caption" className="text-ink-3 ml-1.5 uppercase tracking-wider">
              {meal.diet}
            </Text>
            {meal.isShootPriority && (
              <View className="ml-2 px-1.5 py-0.5 rounded-md bg-lime/15 border border-lime/30">
                <Text
                  variant="caption"
                  className="text-lime"
                  style={{ fontSize: 10, fontFamily: "Inter_600SemiBold" }}
                >
                  ★ Priority
                </Text>
              </View>
            )}
          </View>
          <Text variant="h3" className="text-ink" numberOfLines={2}>
            {meal.mealName}
          </Text>
        </View>
        <View className="items-end">
          <View className="flex-row items-baseline">
            <Text
              tabular
              style={{
                fontFamily: "Inter_700Bold",
                fontSize: 18,
                color: "#D8FF5C",
                letterSpacing: -0.3
              }}
            >
              {meal.calories}
            </Text>
            <Text variant="caption" className="text-ink-3 ml-1">
              kcal
            </Text>
          </View>
          <View className="flex-row items-center mt-1">
            <Star size={11} color={colors.lime} fill={colors.lime} strokeWidth={2} />
            <Text
              variant="caption"
              className="text-ink-2 ml-1"
              tabular
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              {meal.calBracket}
            </Text>
          </View>
        </View>
      </View>

      <View
        className="flex-row mt-3 pt-3 border-t border-line"
        style={{ gap: 8 }}
      >
        <MacroPill label="P" value={Math.round(meal.proteinG)} color="#60A5FA" />
        <MacroPill label="C" value={Math.round(meal.carbsG)} color="#C6F432" />
        <MacroPill label="F" value={Math.round(meal.fatG)} color="#FBBF24" />
      </View>
    </MotiView>
  );
}

function MacroPill({
  label,
  value,
  color
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <View className="flex-row items-baseline">
      <View
        style={{
          width: 6,
          height: 6,
          borderRadius: 3,
          backgroundColor: color,
          marginRight: 5,
          alignSelf: "center"
        }}
      />
      <Text
        variant="caption"
        className="text-ink-3 mr-1"
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </Text>
      <Text
        variant="caption"
        className="text-ink"
        tabular
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {value}g
      </Text>
    </View>
  );
}
