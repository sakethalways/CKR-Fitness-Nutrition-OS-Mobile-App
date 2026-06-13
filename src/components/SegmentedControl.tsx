import React from "react";
import { View, LayoutChangeEvent } from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring
} from "react-native-reanimated";
import { Pressable } from "./Pressable";
import { Text } from "./Text";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  value: T;
  onChange: (v: T) => void;
  options: Option<T>[];
};

export function SegmentedControl<T extends string>({
  value,
  onChange,
  options
}: Props<T>) {
  const [width, setWidth] = React.useState(0);
  const itemWidth = width > 0 ? width / options.length : 0;
  const idx = Math.max(
    0,
    options.findIndex((o) => o.value === value)
  );
  const x = useSharedValue(0);

  React.useEffect(() => {
    x.value = withSpring(idx * itemWidth, {
      damping: 16,
      stiffness: 280,
      mass: 0.6
    });
  }, [idx, itemWidth, x]);

  const indicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }]
  }));

  return (
    <View
      onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}
      className="bg-surface border border-line rounded-2xl p-1 flex-row relative"
    >
      {itemWidth > 0 ? (
        <Animated.View
          style={[
            {
              position: "absolute",
              top: 4,
              left: 4,
              width: itemWidth - 4,
              bottom: 4,
              borderRadius: 14,
              backgroundColor: "#FE7F0B"
            },
            indicatorStyle
          ]}
        />
      ) : null}
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            scaleTo={0.98}
            haptic="light"
            className="flex-1 h-10 items-center justify-center rounded-xl"
          >
            <Text
              variant="bodyMedium"
              style={{
                color: active ? "#0A0B0D" : "#94A3B8",
                fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium"
              }}
            >
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
