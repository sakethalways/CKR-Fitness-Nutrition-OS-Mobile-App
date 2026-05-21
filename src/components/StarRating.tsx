import React from "react";
import { View } from "react-native";
import { Star } from "lucide-react-native";
import { Text } from "./Text";

type Props = {
  value: number; // out of 10
  size?: number;
  showNumber?: boolean;
};

export function StarRating({ value, size = 12, showNumber = true }: Props) {
  const fillScore = value / 2; // convert 0-10 → 0-5
  return (
    <View className="flex-row items-center">
      {showNumber ? (
        <Text
          variant="caption"
          className="text-ink mr-1.5"
          tabular
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {value.toFixed(1)}
        </Text>
      ) : null}
      {Array.from({ length: 5 }).map((_, i) => {
        const isFilled = i + 1 <= fillScore;
        const isHalf = !isFilled && i + 0.5 <= fillScore;
        return (
          <Star
            key={i}
            size={size}
            color={isFilled || isHalf ? "#C6F432" : "rgba(255,255,255,0.18)"}
            fill={isFilled ? "#C6F432" : "transparent"}
            strokeWidth={2}
            style={{ marginLeft: i > 0 ? 1.5 : 0 }}
          />
        );
      })}
    </View>
  );
}
