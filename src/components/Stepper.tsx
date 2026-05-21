import React from "react";
import { View, TextInput, Pressable as RNPressable } from "react-native";
import { Minus, Plus } from "lucide-react-native";
import { Text } from "./Text";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

type Props = {
  label?: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
};

const HEIGHT = 40;
const BTN_W = 30;

export function Stepper({
  label,
  value,
  onChange,
  min = 0,
  max = 999,
  step = 1,
  suffix
}: Props) {
  const clamp = (n: number) => Math.max(min, Math.min(max, n));
  const dec = () => {
    haptics.tap();
    onChange(clamp(value - step));
  };
  const inc = () => {
    haptics.tap();
    onChange(clamp(value + step));
  };

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {label ? (
        <Text
          variant="label"
          className="text-ink-2 mb-1.5"
          numberOfLines={1}
        >
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View
        className="bg-surface border border-line-strong rounded-xl flex-row items-center"
        style={{ height: HEIGHT, overflow: "hidden" }}
      >
        <RNPressable
          onPress={dec}
          hitSlop={6}
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
          style={{
            width: BTN_W,
            height: HEIGHT,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Minus size={13} color={colors.ink2} strokeWidth={2.4} />
        </RNPressable>

        <View
          style={{
            flex: 1,
            minWidth: 0,
            flexDirection: "row",
            alignItems: "baseline",
            justifyContent: "center",
            paddingHorizontal: 2
          }}
        >
          <TextInput
            value={String(value)}
            onChangeText={(t) => {
              const cleaned = t.replace(/[^0-9.]/g, "");
              if (cleaned === "") {
                onChange(min);
                return;
              }
              const n = parseFloat(cleaned);
              if (Number.isFinite(n)) onChange(clamp(n));
            }}
            keyboardType="decimal-pad"
            selectionColor={colors.lime}
            selectTextOnFocus
            numberOfLines={1}
            style={{
              color: "#FFFFFF",
              fontFamily: "Inter_700Bold",
              fontSize: 15,
              padding: 0,
              textAlign: "center",
              fontVariant: ["tabular-nums"],
              flexShrink: 0,
              minWidth: 18
            }}
          />
          {suffix ? (
            <Text
              numberOfLines={1}
              style={{
                color: "#64748B",
                fontFamily: "Inter_500Medium",
                fontSize: 10,
                marginLeft: 2,
                flexShrink: 1
              }}
            >
              {suffix}
            </Text>
          ) : null}
        </View>

        <RNPressable
          onPress={inc}
          hitSlop={6}
          android_ripple={{ color: "rgba(255,255,255,0.08)" }}
          style={{
            width: BTN_W,
            height: HEIGHT,
            alignItems: "center",
            justifyContent: "center"
          }}
        >
          <Plus size={13} color={colors.ink2} strokeWidth={2.4} />
        </RNPressable>
      </View>
    </View>
  );
}
