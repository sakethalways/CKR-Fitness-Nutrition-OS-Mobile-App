import React, { useCallback } from "react";
import { Pressable as RNPressable, PressableProps, ViewStyle } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { motion } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

const AnimatedPressable = Animated.createAnimatedComponent(RNPressable);

type Props = PressableProps & {
  scaleTo?: number;
  haptic?: "light" | "medium" | "none";
  style?: ViewStyle | ViewStyle[];
};

export function Pressable({
  scaleTo = 0.97,
  haptic = "light",
  onPressIn,
  onPressOut,
  style,
  children,
  ...rest
}: Props) {
  const scale = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }]
  }));

  const handlePressIn = useCallback(
    (e: any) => {
      scale.value = withSpring(scaleTo, motion.springSnappy);
      if (haptic === "light") haptics.tap();
      if (haptic === "medium") haptics.press();
      onPressIn?.(e);
    },
    [scale, scaleTo, haptic, onPressIn]
  );

  const handlePressOut = useCallback(
    (e: any) => {
      scale.value = withSpring(1, motion.spring);
      onPressOut?.(e);
    },
    [scale, onPressOut]
  );

  return (
    <AnimatedPressable
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      style={[animatedStyle, style as any]}
      {...rest}
    >
      {children as any}
    </AnimatedPressable>
  );
}
