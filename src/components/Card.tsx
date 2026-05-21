import React from "react";
import { View, ViewProps } from "react-native";
import { MotiView } from "moti";
import { motion } from "@/theme/tokens";

type Props = ViewProps & {
  delay?: number;
  animateIn?: boolean;
  elevated?: boolean;
  padded?: boolean;
  className?: string;
};

export function Card({
  children,
  delay = 0,
  animateIn = true,
  elevated,
  padded = true,
  className = "",
  style,
  ...rest
}: Props) {
  const base = `rounded-2xl border border-line ${
    elevated ? "bg-elevated" : "bg-surface"
  } ${padded ? "p-4" : ""}`;

  if (!animateIn) {
    return (
      <View className={`${base} ${className}`} style={style} {...rest}>
        {children}
      </View>
    );
  }

  return (
    <MotiView
      from={{ opacity: 0, translateY: 12, scale: 0.985 }}
      animate={{ opacity: 1, translateY: 0, scale: 1 }}
      transition={{
        type: "spring",
        damping: motion.spring.damping,
        stiffness: motion.spring.stiffness,
        delay
      }}
      className={`${base} ${className}`}
      style={style}
    >
      {children}
    </MotiView>
  );
}
