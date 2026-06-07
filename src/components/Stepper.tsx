import React, { useState } from "react";
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

  // Display is DERIVED, not synced via an effect:
  //   - not focused → always show the committed `value` (single source of truth)
  //   - focused     → show what the user is typing (local `text`)
  // This avoids the effect/focus race that could reset a field to its min
  // (e.g. height snapping to 120) and lets multi-digit entry work cleanly.
  const [text, setText] = useState("");
  const [focused, setFocused] = useState(false);
  const display = focused ? text : String(value);

  const bump = (delta: number) => {
    haptics.tap();
    const c = clamp(value + delta);
    onChange(c);
    if (focused) setText(String(c));
  };

  const onChangeText = (t: string) => {
    const cleaned = t.replace(/[^0-9.]/g, "");
    setText(cleaned);
    // Commit live (no min-clamp mid-typing) so the parent has the latest value
    // even if the user taps Save without blurring. Final clamp happens on blur.
    if (cleaned === "" || cleaned === ".") return;
    const n = parseFloat(cleaned);
    if (Number.isFinite(n)) onChange(Math.min(max, n));
  };

  const onBlur = () => {
    setFocused(false);
    const n = parseFloat(text);
    // Invalid/empty → keep the last good value (don't snap to min).
    if (Number.isFinite(n)) onChange(clamp(n));
  };

  return (
    <View style={{ flex: 1, minWidth: 0 }}>
      {label ? (
        <Text variant="label" className="text-ink-2 mb-1.5" numberOfLines={1}>
          {label.toUpperCase()}
        </Text>
      ) : null}
      <View
        className="bg-surface border border-line-strong rounded-xl flex-row items-center"
        style={{ height: HEIGHT, overflow: "hidden" }}
      >
        <RNPressable
          onPress={() => bump(-step)}
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
            value={display}
            onChangeText={onChangeText}
            onFocus={() => {
              setText(String(value));
              setFocused(true);
            }}
            onBlur={onBlur}
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
          onPress={() => bump(step)}
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
