import React from "react";
import { View } from "react-native";
import { Text } from "./Text";

type Tone = "neutral" | "lime" | "info" | "warn" | "danger" | "success";

type Props = {
  label: string;
  tone?: Tone;
  size?: "sm" | "md";
  iconLeft?: React.ReactNode;
};

const toneCls: Record<Tone, { bg: string; text: string; border: string }> = {
  neutral: {
    bg: "bg-white/[0.05]",
    text: "text-ink-2",
    border: "border-line"
  },
  lime: {
    bg: "bg-lime/15",
    text: "text-lime",
    border: "border-lime/30"
  },
  info: {
    bg: "bg-info/15",
    text: "text-info",
    border: "border-info/30"
  },
  warn: {
    bg: "bg-warn/15",
    text: "text-warn",
    border: "border-warn/30"
  },
  danger: {
    bg: "bg-danger/15",
    text: "text-danger",
    border: "border-danger/30"
  },
  success: {
    bg: "bg-success/15",
    text: "text-success",
    border: "border-success/30"
  }
};

export function Chip({ label, tone = "neutral", size = "sm", iconLeft }: Props) {
  const t = toneCls[tone];
  const pad = size === "sm" ? "px-2.5 py-1" : "px-3 py-1.5";

  return (
    <View className={`flex-row items-center rounded-full border ${t.bg} ${t.border} ${pad}`}>
      {iconLeft ? <View className="mr-1">{iconLeft}</View> : null}
      <Text
        variant="caption"
        className={t.text}
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </Text>
    </View>
  );
}
