import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { Check } from "lucide-react-native";
import { Pressable } from "./Pressable";
import { Text } from "./Text";
import { colors } from "@/theme/tokens";

type Props<T extends string> = {
  options: readonly T[];
  value: T[];
  onChange: (v: T[]) => void;
  exclusive?: T; // if this value is picked, clears others; and vice versa
};

export function ChipSelector<T extends string>({
  options,
  value,
  onChange,
  exclusive
}: Props<T>) {
  const toggle = (opt: T) => {
    let next: T[];
    const has = value.includes(opt);
    if (exclusive) {
      if (opt === exclusive) {
        next = has ? [] : [exclusive];
      } else {
        const without = value.filter((v) => v !== exclusive && v !== opt);
        next = has ? without : [...without, opt];
      }
    } else {
      next = has ? value.filter((v) => v !== opt) : [...value, opt];
    }
    onChange(next);
  };

  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((opt) => {
        const active = value.includes(opt);
        return (
          <Pressable
            key={opt}
            onPress={() => toggle(opt)}
            scaleTo={0.96}
            haptic="light"
          >
            <MotiView
              animate={{
                backgroundColor: active ? "rgba(254,127,11,0.18)" : "rgba(255,255,255,0.04)",
                borderColor: active ? "#FE7F0B" : "rgba(255,255,255,0.10)"
              }}
              transition={{ type: "timing", duration: 90 }}
              className="flex-row items-center rounded-full border px-3 py-2"
            >
              {active ? (
                <Check
                  size={13}
                  color={colors.lime}
                  strokeWidth={2.8}
                  style={{ marginRight: 4 }}
                />
              ) : null}
              <Text
                variant="bodyMedium"
                style={{
                  color: active ? "#FFA94D" : "#94A3B8",
                  fontSize: 13,
                  fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium"
                }}
              >
                {opt}
              </Text>
            </MotiView>
          </Pressable>
        );
      })}
    </View>
  );
}
