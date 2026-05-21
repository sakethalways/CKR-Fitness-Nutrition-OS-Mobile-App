import React from "react";
import { Text as RNText, TextProps } from "react-native";

type Variant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "body"
  | "bodyMedium"
  | "caption"
  | "label"
  | "mono";

const variantStyle: Record<
  Variant,
  { family: string; size: number; lh: number; tracking?: number }
> = {
  display: { family: "Inter_700Bold", size: 26, lh: 32, tracking: -0.4 },
  h1: { family: "Inter_700Bold", size: 22, lh: 28, tracking: -0.3 },
  h2: { family: "Inter_600SemiBold", size: 18, lh: 24, tracking: -0.2 },
  h3: { family: "Inter_600SemiBold", size: 15, lh: 20 },
  body: { family: "Inter_400Regular", size: 14, lh: 20 },
  bodyMedium: { family: "Inter_500Medium", size: 14, lh: 20 },
  caption: { family: "Inter_500Medium", size: 11, lh: 15, tracking: 0.2 },
  label: { family: "Inter_600SemiBold", size: 11, lh: 15, tracking: 0.5 },
  mono: { family: "Inter_500Medium", size: 13, lh: 18 }
};

type Props = TextProps & {
  variant?: Variant;
  className?: string;
  tabular?: boolean;
};

export function Text({
  variant = "body",
  className = "",
  tabular,
  style,
  ...rest
}: Props) {
  const v = variantStyle[variant];
  return (
    <RNText
      className={`text-ink ${className}`}
      style={[
        {
          fontFamily: v.family,
          fontSize: v.size,
          lineHeight: v.lh,
          letterSpacing: v.tracking ?? 0,
          fontVariant: tabular ? ["tabular-nums"] : undefined
        },
        style
      ]}
      {...rest}
    />
  );
}
