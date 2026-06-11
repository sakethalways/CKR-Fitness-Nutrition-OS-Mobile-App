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
  // The axis is wide enough to ALWAYS show both the plan's achievable range
  // [low..high] AND the target, so the target marker is never jammed against an
  // edge. The achievable range is drawn as a highlighted segment; the target
  // sits at its true proportional spot. When the catalogue can't reach the
  // target, you can clearly see the target marker sitting beyond the segment.
  const safeLow = Math.min(low, high);
  const safeHigh = Math.max(low, high);

  // Include the target (with its ±5% band as natural breathing room) in the
  // axis domain, then pad a little so nothing lands exactly on the edge.
  const rawLow = Math.min(safeLow, target * 0.95);
  const rawHigh = Math.max(safeHigh, target * 1.05);
  const pad = Math.max(1, (rawHigh - rawLow) * 0.08);
  const domainLow = rawLow - pad;
  const domainSpan = Math.max(1, rawHigh + pad - domainLow);

  const pct = (v: number) =>
    Math.min(100, Math.max(0, ((v - domainLow) / domainSpan) * 100));
  const lowPct = pct(safeLow);
  const highPct = pct(safeHigh);
  const targetPct = pct(target);

  // Is the target reachable by the plan? Drives an honest hint.
  const targetInRange = target >= safeLow && target <= safeHigh;

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
            value={safeLow}
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
            value={safeHigh}
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

        {/* Axis: neutral track + highlighted achievable range + target pointer */}
        <View className="mt-4 relative" style={{ height: 24 }}>
          <View
            className="absolute left-0 right-0 rounded-full bg-white/[0.12]"
            style={{ top: 9, height: 6 }}
          />
          {/* achievable range segment (where the plan actually lands) */}
          <View
            className="absolute rounded-full"
            style={{
              top: 9,
              height: 6,
              left: `${lowPct}%`,
              width: `${Math.max(0, highPct - lowPct)}%`,
              backgroundColor: "rgba(198,244,50,0.40)"
            }}
          />
          {/* range end ticks */}
          {[lowPct, highPct].map((p, i) => (
            <View
              key={i}
              style={{
                position: "absolute",
                left: `${p}%`,
                top: 5,
                height: 14,
                width: 2,
                marginLeft: -1,
                backgroundColor: "rgba(255,255,255,0.55)"
              }}
            />
          ))}
          {/* target pointer: tick line + diamond */}
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

        {/* Labels: range ends on top row, target on the row below its pointer. */}
        <View className="mt-1.5 relative" style={{ height: 30 }}>
          <View
            style={{ position: "absolute", left: `${lowPct}%`, width: 60, marginLeft: -30, alignItems: "center" }}
          >
            <Text variant="caption" className="text-ink-3" tabular>
              {safeLow}
            </Text>
          </View>
          <View
            style={{ position: "absolute", left: `${highPct}%`, width: 60, marginLeft: -30, alignItems: "center" }}
          >
            <Text variant="caption" className="text-ink-3" tabular>
              {safeHigh}
            </Text>
          </View>
          <View
            style={{ position: "absolute", top: 14, left: `${targetPct}%`, width: 96, marginLeft: -48, alignItems: "center" }}
          >
            <Text
              variant="caption"
              className={targetInRange ? "text-ink" : "text-warn"}
              tabular
              style={{ fontFamily: "Inter_600SemiBold" }}
            >
              target {target}
            </Text>
          </View>
        </View>

        {/* Honest hint when the catalogue can't reach the target. */}
        {!targetInRange ? (
          <Text variant="caption" className="text-warn mt-1.5" style={{ fontSize: 11 }}>
            {target > safeHigh
              ? `Plan tops out ~${safeHigh} kcal — ${target - safeHigh} below target. Add higher-calorie meals to close the gap.`
              : `Plan starts ~${safeLow} kcal — ${safeLow - target} above target. Add lighter meals to close the gap.`}
          </Text>
        ) : null}
      </View>
    </View>
  );
}
