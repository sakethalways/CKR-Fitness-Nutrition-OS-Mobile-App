import React, { useMemo } from "react";
import { View, ScrollView } from "react-native";
import { Pressable } from "./Pressable";
import { Text } from "./Text";
import { colors } from "@/theme/tokens";

// Height is stored in CM (the BMR formula needs cm). The UI, however, picks
// feet + inches via tappable chips — no text entry, so it can never produce a
// clamped/garbage value the way the numeric field did.

const FEET = [4, 5, 6, 7];
const INCHES = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

const cmToFtIn = (cm: number): { ft: number; inch: number } => {
  const totalInches = Math.round(cm / 2.54);
  let ft = Math.floor(totalInches / 12);
  let inch = totalInches - ft * 12;
  if (inch === 12) {
    ft += 1;
    inch = 0;
  }
  return { ft, inch };
};

const ftInToCm = (ft: number, inch: number): number =>
  Math.round((ft * 12 + inch) * 2.54);

type Props = {
  label?: string;
  value: number; // cm
  onChange: (cm: number) => void;
};

export function HeightField({ label = "Height", value, onChange }: Props) {
  const { ft, inch } = useMemo(() => cmToFtIn(value), [value]);

  const setFt = (f: number) => onChange(ftInToCm(f, inch));
  const setInch = (i: number) => onChange(ftInToCm(ft, i));

  return (
    <View>
      <View className="flex-row items-baseline justify-between mb-1.5">
        <Text variant="label" className="text-ink-2">
          {label.toUpperCase()}
        </Text>
        <Text
          variant="caption"
          className="text-lime"
          tabular
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {ft}′ {inch}″ · {value} cm
        </Text>
      </View>

      {/* Feet */}
      <View className="flex-row" style={{ gap: 6 }}>
        {FEET.map((f) => {
          const active = f === ft;
          return (
            <Pressable
              key={f}
              onPress={() => setFt(f)}
              scaleTo={0.96}
              haptic="light"
              className={`flex-1 h-10 rounded-xl items-center justify-center border ${
                active ? "bg-lime/15 border-lime/50" : "bg-surface border-line"
              }`}
            >
              <Text
                variant="bodyMedium"
                style={{
                  color: active ? colors.lime : colors.ink2,
                  fontFamily: active ? "Inter_700Bold" : "Inter_500Medium"
                }}
              >
                {f} ft
              </Text>
            </Pressable>
          );
        })}
      </View>

      {/* Inches */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        className="mt-2"
        contentContainerStyle={{ gap: 6, paddingRight: 8 }}
      >
        {INCHES.map((i) => {
          const active = i === inch;
          return (
            <Pressable
              key={i}
              onPress={() => setInch(i)}
              scaleTo={0.94}
              haptic="light"
              className={`w-11 h-10 rounded-xl items-center justify-center border ${
                active ? "bg-lime/15 border-lime/50" : "bg-surface border-line"
              }`}
            >
              <Text
                variant="caption"
                style={{
                  color: active ? colors.lime : colors.ink3,
                  fontFamily: active ? "Inter_700Bold" : "Inter_500Medium"
                }}
              >
                {i}″
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
