import React from "react";
import { Text, View, ActivityIndicator } from "react-native";
import { Pressable } from "./Pressable";

type Variant = "primary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

type Props = {
  label: string;
  onPress?: () => void;
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  disabled?: boolean;
  iconLeft?: React.ReactNode;
  iconRight?: React.ReactNode;
  fullWidth?: boolean;
};

const sizeCls: Record<Size, { wrap: string; text: string }> = {
  sm: { wrap: "px-3 h-9 rounded-xl", text: "text-sm" },
  md: { wrap: "px-4 h-11 rounded-xl", text: "text-[15px]" },
  lg: { wrap: "px-5 h-14 rounded-2xl", text: "text-base" }
};

const variantCls: Record<Variant, { wrap: string; text: string }> = {
  primary: { wrap: "bg-lime", text: "text-bg" },
  ghost: { wrap: "bg-white/[0.04]", text: "text-ink" },
  outline: { wrap: "bg-transparent border border-line-strong", text: "text-ink" },
  danger: { wrap: "bg-danger/15 border border-danger/40", text: "text-danger" }
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading,
  disabled,
  iconLeft,
  iconRight,
  fullWidth
}: Props) {
  const s = sizeCls[size];
  const v = variantCls[variant];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={isDisabled ? undefined : onPress}
      haptic={variant === "primary" ? "medium" : "light"}
      disabled={isDisabled}
      className={`${s.wrap} ${v.wrap} ${fullWidth ? "w-full" : ""} ${
        isDisabled ? "opacity-50" : ""
      } items-center justify-center flex-row`}
    >
      {loading ? (
        <ActivityIndicator color={variant === "primary" ? "#0A0B0D" : "#FFFFFF"} />
      ) : (
        <View className="flex-row items-center">
          {iconLeft ? <View className="mr-2">{iconLeft}</View> : null}
          <Text
            className={`font-semibold ${s.text} ${v.text}`}
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {label}
          </Text>
          {iconRight ? <View className="ml-2">{iconRight}</View> : null}
        </View>
      )}
    </Pressable>
  );
}
