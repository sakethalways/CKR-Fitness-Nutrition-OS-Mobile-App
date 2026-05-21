import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { Pressable } from "./Pressable";
import { Text } from "./Text";
import * as haptics from "@/lib/haptics";

type Props = {
  value: number | null; // 0-10, null = unset
  onChange: (v: number) => void;
};

export function RatingPill({ value, onChange }: Props) {
  return (
    <View className="flex-row" style={{ gap: 4 }}>
      {Array.from({ length: 10 }).map((_, i) => {
        const score = i + 1;
        const isSelected = value === score;
        const isFilled = value !== null && score <= value;
        const tone = value === null
          ? "neutral"
          : value < 4
          ? "danger"
          : value >= 8
          ? "lime"
          : "warn";

        const fillColor =
          tone === "danger"
            ? "#F87171"
            : tone === "lime"
            ? "#C6F432"
            : tone === "warn"
            ? "#FBBF24"
            : "rgba(255,255,255,0.15)";

        return (
          <Pressable
            key={score}
            onPress={() => {
              onChange(score);
              haptics.tap();
            }}
            scaleTo={0.92}
            haptic="none"
            className="flex-1"
          >
            <MotiView
              animate={{
                backgroundColor: isFilled ? fillColor : "rgba(255,255,255,0.04)",
                scaleY: isSelected ? 1.25 : 1
              }}
              transition={{ type: "spring", damping: 14, stiffness: 240 }}
              style={{
                height: 28,
                borderRadius: 8,
                borderWidth: 1,
                borderColor: isFilled
                  ? "transparent"
                  : "rgba(255,255,255,0.10)",
                alignItems: "center",
                justifyContent: "center"
              }}
            >
              {isSelected ? (
                <Text
                  variant="caption"
                  tabular
                  style={{
                    color: tone === "lime" || tone === "warn" ? "#0A0B0D" : "#FFFFFF",
                    fontFamily: "Inter_700Bold",
                    fontSize: 11
                  }}
                >
                  {score}
                </Text>
              ) : null}
            </MotiView>
          </Pressable>
        );
      })}
    </View>
  );
}
