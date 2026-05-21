import React from "react";
import { View } from "react-native";
import { Coffee, Soup, Moon, Cookie } from "lucide-react-native";
import { Text } from "./Text";
import { SlotType } from "@/data/types";
import { colors } from "@/theme/tokens";

const ICONS: Record<SlotType, React.ComponentType<any>> = {
  Breakfast: Coffee,
  Lunch: Soup,
  Dinner: Moon,
  Snack: Cookie
};

type Props = {
  slot: SlotType;
  targetKcal: number;
  count?: number;
};

export function SlotHeader({ slot, targetKcal, count = 2 }: Props) {
  const Icon = ICONS[slot];
  return (
    <View className="flex-row items-center justify-between mt-6 mb-3">
      <View className="flex-row items-center">
        <View className="w-7 h-7 rounded-lg bg-lime/15 border border-lime/25 items-center justify-center mr-2.5">
          <Icon size={14} color={colors.lime} strokeWidth={2.2} />
        </View>
        <Text variant="label" className="text-ink">
          {slot.toUpperCase()}
        </Text>
        <View className="ml-2 px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-line">
          <Text
            variant="caption"
            className="text-ink-3"
            style={{ fontSize: 10 }}
          >
            {count} options
          </Text>
        </View>
      </View>
      <Text variant="caption" className="text-ink-3" tabular>
        ~{targetKcal} kcal
      </Text>
    </View>
  );
}
