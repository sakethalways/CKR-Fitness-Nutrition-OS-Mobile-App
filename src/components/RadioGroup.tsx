import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { Pressable } from "./Pressable";
import { Text } from "./Text";

type Option<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
};

export function RadioGroup<T extends string>({
  value,
  onChange,
  options
}: Props<T>) {
  return (
    <View style={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            scaleTo={0.99}
            haptic="light"
          >
            <MotiView
              animate={{
                backgroundColor: active
                  ? "rgba(198,244,50,0.08)"
                  : "rgba(255,255,255,0.02)",
                borderColor: active ? "#C6F432" : "rgba(255,255,255,0.08)"
              }}
              transition={{ type: "timing", duration: 100 }}
              className="flex-row items-center rounded-2xl border px-4 py-3"
            >
              <MotiView
                animate={{
                  backgroundColor: active ? "#C6F432" : "transparent",
                  borderColor: active ? "#C6F432" : "rgba(255,255,255,0.18)"
                }}
                transition={{ type: "timing", duration: 100 }}
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 10,
                  borderWidth: 2,
                  alignItems: "center",
                  justifyContent: "center"
                }}
              >
                <MotiView
                  animate={{ scale: active ? 1 : 0 }}
                  transition={{ type: "spring", damping: 14, stiffness: 220 }}
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: 4,
                    backgroundColor: "#0A0B0D"
                  }}
                />
              </MotiView>
              <View className="ml-3 flex-1">
                <Text
                  variant="bodyMedium"
                  className={active ? "text-ink" : "text-ink-2"}
                  style={{
                    fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium"
                  }}
                >
                  {o.label}
                </Text>
                {o.hint ? (
                  <Text variant="caption" className="text-ink-3 mt-0.5">
                    {o.hint}
                  </Text>
                ) : null}
              </View>
            </MotiView>
          </Pressable>
        );
      })}
    </View>
  );
}
