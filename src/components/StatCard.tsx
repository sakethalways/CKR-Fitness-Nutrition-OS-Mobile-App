import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { Text } from "./Text";
import { AnimatedNumber } from "./AnimatedNumber";

type Props = {
  label: string;
  value: number;
  decimals?: number;
  suffix?: string;
  prefix?: string;
  tone?: "neutral" | "lime";
  delay?: number;
};

export function StatCard({
  label,
  value,
  decimals = 0,
  suffix,
  prefix,
  tone = "neutral",
  delay = 0
}: Props) {
  const isLime = tone === "lime";
  return (
    <MotiView
      from={{ opacity: 0, translateY: 14, scale: 0.97 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{ type: "spring", damping: 18, stiffness: 180, delay }}
      className={`flex-1 rounded-2xl border p-3.5 ${
        isLime
          ? "bg-lime/10 border-lime/30"
          : "bg-surface border-line"
      }`}
    >
      <Text
        variant="caption"
        className={isLime ? "text-lime" : "text-ink-3"}
        numberOfLines={1}
      >
        {label.toUpperCase()}
      </Text>
      <View className="mt-1.5">
        <AnimatedNumber
          value={value}
          decimals={decimals}
          prefix={prefix}
          suffix={suffix}
          style={{
            fontSize: 22,
            lineHeight: 28,
            letterSpacing: -0.4,
            color: isLime ? "#FFA94D" : "#FFFFFF"
          }}
        />
      </View>
    </MotiView>
  );
}
