import React, { useState } from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { MotiView } from "moti";
import { Text } from "./Text";
import { colors } from "@/theme/tokens";

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  minHeight?: number;
};

export function Textarea({
  label,
  helper,
  minHeight = 96,
  onFocus,
  onBlur,
  ...rest
}: Props) {
  const [focused, setFocused] = useState(false);
  return (
    <View className="w-full">
      {label ? (
        <Text variant="label" className="text-ink-2 mb-2">
          {label.toUpperCase()}
        </Text>
      ) : null}
      <MotiView
        animate={{
          borderColor: focused ? colors.lime : "rgba(255,255,255,0.14)",
          backgroundColor: focused ? "rgba(254,127,11,0.04)" : colors.surface
        }}
        transition={{ type: "timing", duration: 120 }}
        className="rounded-2xl border px-4 py-3"
      >
        <TextInput
          multiline
          placeholderTextColor={colors.ink3}
          selectionColor={colors.lime}
          textAlignVertical="top"
          className="text-ink"
          style={{
            minHeight,
            fontFamily: "Inter_500Medium",
            fontSize: 15,
            lineHeight: 22,
            padding: 0
          }}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
      </MotiView>
      {helper ? (
        <Text variant="caption" className="text-ink-3 mt-1.5">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
