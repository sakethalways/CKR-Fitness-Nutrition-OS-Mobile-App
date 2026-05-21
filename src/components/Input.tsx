import React, { useState } from "react";
import { TextInput, TextInputProps, View } from "react-native";
import { MotiView } from "moti";
import { Text } from "./Text";
import { colors } from "@/theme/tokens";

type Props = TextInputProps & {
  label?: string;
  helper?: string;
  error?: string;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
};

export function Input({
  label,
  helper,
  error,
  iconLeft,
  iconRight,
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
          borderColor: error
            ? "#F87171"
            : focused
            ? colors.lime
            : "rgba(255,255,255,0.14)",
          backgroundColor: focused ? "rgba(198,244,50,0.04)" : colors.surface
        }}
        transition={{ type: "timing", duration: 120 }}
        className="rounded-xl border flex-row items-center px-4 h-12"
      >
        {iconLeft ? <View className="mr-2">{iconLeft}</View> : null}
        <TextInput
          placeholderTextColor={colors.ink3}
          selectionColor={colors.lime}
          className="flex-1 text-ink"
          style={{ fontFamily: "Inter_500Medium", fontSize: 15 }}
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
        {iconRight ? <View className="ml-2">{iconRight}</View> : null}
      </MotiView>
      {error ? (
        <Text variant="caption" className="text-danger mt-1.5">
          {error}
        </Text>
      ) : helper ? (
        <Text variant="caption" className="text-ink-3 mt-1.5">
          {helper}
        </Text>
      ) : null}
    </View>
  );
}
