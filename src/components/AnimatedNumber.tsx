import React, { useEffect } from "react";
import { TextStyle } from "react-native";
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
  Easing
} from "react-native-reanimated";
import { TextInput } from "react-native";

Animated.addWhitelistedNativeProps({ text: true });
const AnimatedTextInput = Animated.createAnimatedComponent(TextInput);

type Props = {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle | TextStyle[];
};

export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 900,
  prefix = "",
  suffix = "",
  style
}: Props) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(value, {
      duration,
      easing: Easing.out(Easing.cubic)
    });
  }, [value, duration, progress]);

  const animatedProps = useAnimatedProps(() => {
    const n = progress.value;
    const formatted = decimals > 0 ? n.toFixed(decimals) : Math.round(n).toString();
    return { text: `${prefix}${formatted}${suffix}` } as any;
  });

  return (
    <AnimatedTextInput
      editable={false}
      defaultValue={`${prefix}${decimals > 0 ? "0" : "0"}${suffix}`}
      animatedProps={animatedProps}
      style={[
        {
          padding: 0,
          margin: 0,
          color: "#FFFFFF",
          fontFamily: "Inter_700Bold",
          fontVariant: ["tabular-nums"]
        },
        style as any
      ]}
    />
  );
}
