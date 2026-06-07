import React from "react";
import { View } from "react-native";
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
  // The bar spans the plan's range; the ends ARE the range values. The target
  // pointer sits at its proportional spot within that range (clamped to the
  // ends if the plan happens to fall entirely below/above the target).
  const span = Math.max(1, high - low);
  const targetPct = Math.min(100, Math.max(0, ((target - low) / span) * 100));

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
          What the day adds up to if you pick one meal per slot.
        </Text>

        {/* Range bar — neutral track + target pointer (no fill) */}
        <View className="mt-4 relative" style={{ height: 24 }}>
          <View
            className="absolute left-0 right-0 rounded-full bg-white/[0.12]"
            style={{ top: 9, height: 6 }}
          />
          {/* target pointer: tick line + diamond, centered on the track */}
          <View
            style={{
              position: "absolute",
              left: `${targetPct}%`,
              top: 0,
              bottom: 0,
              width: 2,
              marginLeft: -1,
              alignItems: "center",
              justifyContent: "center"
            }}
            pointerEvents="none"
          >
            <View
              style={{
                position: "absolute",
                top: 2,
                bottom: 2,
                left: 0,
                right: 0,
                backgroundColor: "#FFFFFF"
              }}
            />
            <View
              style={{
                width: 10,
                height: 10,
                backgroundColor: "#FFFFFF",
                transform: [{ rotate: "45deg" }],
                borderRadius: 1
              }}
            />
          </View>
        </View>

        {/* Range values at the two ends; target value sits under its pointer. */}
        <View className="mt-1.5 relative" style={{ height: 14 }}>
          <Text
            variant="caption"
            className="text-ink-3"
            tabular
            style={{ position: "absolute", left: 0 }}
          >
            {low}
          </Text>
          <Text
            variant="caption"
            className="text-ink-3"
            tabular
            style={{ position: "absolute", right: 0 }}
          >
            {high}
          </Text>
          <View
            style={{
              position: "absolute",
              left: `${targetPct}%`,
              width: 90,
              marginLeft: -45,
              alignItems: "center"
            }}
          >
            <Text
              variant="caption"
              className="text-ink"
              tabular
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              target {target}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
}
