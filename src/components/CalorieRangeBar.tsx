import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { Target } from "lucide-react-native";
import { Text } from "./Text";
import { AnimatedNumber } from "./AnimatedNumber";
import { colors } from "@/theme/tokens";

type Props = {
  target: number;
  low: number;
  high: number;
};

export function CalorieRangeBar({ target, low, high }: Props) {
  // Visualization spans target ±25% as the scale
  const scaleLow = Math.round(target * 0.75);
  const scaleHigh = Math.round(target * 1.25);
  const span = scaleHigh - scaleLow;

  const leftPct = Math.max(0, ((low - scaleLow) / span) * 100);
  const widthPct = Math.max(2, ((high - low) / span) * 100);
  const targetPct = ((target - scaleLow) / span) * 100;

  return (
    <View className="rounded-2xl border border-lime/30 overflow-hidden">
      <LinearGradient
        colors={["rgba(198,244,50,0.18)", "rgba(198,244,50,0.02)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <View className="p-4">
        <View className="flex-row items-center mb-2">
          <Target size={13} color={colors.lime} strokeWidth={2.4} />
          <Text variant="label" className="text-lime ml-1.5">
            DAILY CALORIE RANGE
          </Text>
        </View>

        <View className="flex-row items-baseline">
          <AnimatedNumber
            value={low}
            style={{
              fontSize: 24,
              fontFamily: "Inter_700Bold",
              color: "#FFFFFF",
              letterSpacing: -0.4
            }}
          />
          <Text variant="h2" className="text-ink-3 mx-1.5">
            –
          </Text>
          <AnimatedNumber
            value={high}
            style={{
              fontSize: 24,
              fontFamily: "Inter_700Bold",
              color: "#FFFFFF",
              letterSpacing: -0.4
            }}
          />
          <Text variant="caption" className="text-ink-2 ml-2">
            kcal/day
          </Text>
        </View>

        <Text variant="caption" className="text-ink-2 mt-1">
          Pick any one from each slot — combo lands within target.
        </Text>

        {/* Visual bar */}
        <View className="mt-4 relative" style={{ height: 28 }}>
          <View className="absolute left-0 right-0 top-3 h-2 rounded-full bg-white/[0.06]" />
          <MotiView
            from={{ width: "0%" as any }}
            animate={{ width: `${widthPct}%` as any }}
            transition={{ type: "spring", damping: 18, stiffness: 140, delay: 300 }}
            style={{
              position: "absolute",
              top: 12,
              left: `${leftPct}%` as any,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#C6F432",
              shadowColor: "#C6F432",
              shadowOpacity: 0.4,
              shadowRadius: 8
            }}
          />
          {/* target marker */}
          <MotiView
            from={{ opacity: 0, translateY: -4 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 360, delay: 600 }}
            style={{
              position: "absolute",
              left: `${targetPct}%` as any,
              top: 0,
              transform: [{ translateX: -8 }] as any
            }}
          >
            <View
              style={{
                width: 0,
                height: 0,
                borderLeftWidth: 6,
                borderRightWidth: 6,
                borderTopWidth: 8,
                borderLeftColor: "transparent",
                borderRightColor: "transparent",
                borderTopColor: "#FFFFFF",
                alignSelf: "center"
              }}
            />
            <View
              style={{
                width: 2,
                height: 20,
                backgroundColor: "#FFFFFF",
                alignSelf: "center",
                marginTop: 0
              }}
            />
          </MotiView>
        </View>

        <View className="flex-row justify-between mt-1.5">
          <Text variant="caption" className="text-ink-4" tabular>
            {scaleLow}
          </Text>
          <Text
            variant="caption"
            className="text-ink"
            tabular
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            target {target}
          </Text>
          <Text variant="caption" className="text-ink-4" tabular>
            {scaleHigh}
          </Text>
        </View>
      </View>
    </View>
  );
}
