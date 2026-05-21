import React from "react";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { View } from "react-native";
import { Pressable } from "./Pressable";

type Props = {
  value: boolean;
  onChange: (v: boolean) => void;
  size?: "sm" | "md";
};

export function Toggle({ value, onChange, size = "md" }: Props) {
  const w = size === "md" ? 48 : 40;
  const h = size === "md" ? 28 : 24;
  const knob = h - 6;
  const x = useSharedValue(value ? w - knob - 3 : 3);

  React.useEffect(() => {
    x.value = withSpring(value ? w - knob - 3 : 3, {
      damping: 14,
      stiffness: 320,
      mass: 0.5
    });
  }, [value, w, knob, x]);

  const knobStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));

  return (
    <Pressable
      onPress={() => onChange(!value)}
      scaleTo={0.95}
      haptic="medium"
    >
      <View
        style={{
          width: w,
          height: h,
          borderRadius: h / 2,
          backgroundColor: value ? "#C6F432" : "rgba(255,255,255,0.10)",
          borderWidth: 1,
          borderColor: value ? "#C6F432" : "rgba(255,255,255,0.14)"
        }}
      >
        <Animated.View
          style={[
            {
              position: "absolute",
              top: (h - knob) / 2 - 1,
              width: knob,
              height: knob,
              borderRadius: knob / 2,
              backgroundColor: value ? "#0A0B0D" : "#FFFFFF"
            },
            knobStyle
          ]}
        />
      </View>
    </Pressable>
  );
}
