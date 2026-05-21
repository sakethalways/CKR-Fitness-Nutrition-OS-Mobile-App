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

        {/* Visual bar
            Geometry — all measured from container top:
              container height : 32
              track            : top 14, height 8  (center at y=18)
              range fill (lime): top 14, height 8  (overlays track)
              target marker    : 2px vertical line spanning y=4 → y=28
                                 (4px above bar top, 4px below bar bottom)
                                 + 8x8 diamond rotated 45° centered at y=18
            This keeps the white target marker visually centered on the lime
            bar rather than floating above it. */}
        <View className="mt-4 relative" style={{ height: 32 }}>
          <View
            className="absolute left-0 right-0 rounded-full bg-white/[0.06]"
            style={{ top: 14, height: 8 }}
          />
          <MotiView
            from={{ width: "0%" as any }}
            animate={{ width: `${widthPct}%` as any }}
            transition={{ type: "spring", damping: 18, stiffness: 140, delay: 300 }}
            style={{
              position: "absolute",
              top: 14,
              left: `${leftPct}%` as any,
              height: 8,
              borderRadius: 4,
              backgroundColor: "#C6F432",
              shadowColor: "#C6F432",
              shadowOpacity: 0.4,
              shadowRadius: 8
            }}
          />
          {/* target marker — vertical line + diamond, centered ON the bar */}
          <MotiView
            from={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: "timing", duration: 360, delay: 600 }}
            style={{
              position: "absolute",
              left: `${targetPct}%` as any,
              top: 0,
              bottom: 0,
              width: 2,
              marginLeft: -1,
              alignItems: "center",
              justifyContent: "center"
            }}
            pointerEvents="none"
          >
            {/* full-height tick line */}
            <View
              style={{
                position: "absolute",
                top: 4,
                bottom: 4,
                left: 0,
                right: 0,
                backgroundColor: "#FFFFFF"
              }}
            />
            {/* center diamond exactly on bar centerline */}
            <View
              style={{
                width: 10,
                height: 10,
                backgroundColor: "#FFFFFF",
                transform: [{ rotate: "45deg" }],
                borderRadius: 1
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
