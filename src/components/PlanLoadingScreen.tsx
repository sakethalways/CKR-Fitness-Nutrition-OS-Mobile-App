import React, { useEffect, useRef } from "react";
import { View, Image, StatusBar } from "react-native";
import { MotiView } from "moti";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView } from "react-native-safe-area-context";
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing
} from "react-native-reanimated";
import { Text } from "./Text";
import {
  LOADING_IMAGES,
  FITNESS_QUOTES,
  pickRandom
} from "@/data/loadingAssets";
import { colors } from "@/theme/tokens";

type Props = {
  title?: string;
  subtitle?: string;
};

export function PlanLoadingScreen({
  title = "Building your plan",
  subtitle = "Picking meals, balancing macros…"
}: Props) {
  // Fresh random pick on every mount. With the Stack-based navigation in
  // (app)/_layout.tsx, this component remounts on every push to /meals,
  // so trainers see a new image + quote every time.
  const image = useRef(pickRandom(LOADING_IMAGES)).current;
  const quote = useRef(pickRandom(FITNESS_QUOTES)).current;

  // Gentle pulse on the image itself (no halo, no container)
  const pulse = useSharedValue(1);
  useEffect(() => {
    pulse.value = withRepeat(
      withTiming(1.05, { duration: 1100, easing: Easing.inOut(Easing.quad) }),
      -1,
      true
    );
    return () => cancelAnimation(pulse);
  }, [pulse]);

  const pulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: pulse.value }]
  }));

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#11160B", "#0A0B0D", "#0A0B0D"]}
        locations={[0, 0.45, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top", "bottom"]} className="flex-1">
        <View className="flex-1 items-center justify-center px-6">
          {/* Image — bare, no halo, no square container */}
          <MotiView
            from={{ opacity: 0, scale: 0.9, translateY: 6 }}
            animate={{ opacity: 1, scale: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
          >
            <Animated.View style={pulseStyle}>
              <Image
                source={image}
                resizeMode="contain"
                style={{ width: 140, height: 140 }}
              />
            </Animated.View>
          </MotiView>

          {/* Loading title */}
          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 320, delay: 180 }}
            className="mt-6 items-center"
          >
            <Text variant="caption" className="text-lime mb-1">
              LOADING
            </Text>
            <Text variant="h2" className="text-ink">
              {title}
            </Text>
            <Text variant="caption" className="text-ink-2 mt-1.5 text-center">
              {subtitle}
            </Text>
          </MotiView>

          {/* Animated dots */}
          <View className="flex-row mt-4" style={{ gap: 6 }}>
            {[0, 1, 2].map((i) => (
              <MotiView
                key={i}
                from={{ opacity: 0.25 }}
                animate={{ opacity: 1 }}
                transition={{
                  type: "timing",
                  duration: 600,
                  loop: true,
                  repeatReverse: true,
                  delay: i * 180
                }}
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: 3,
                  backgroundColor: colors.lime
                }}
              />
            ))}
          </View>

          {/* Fitness quote */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "timing", duration: 400, delay: 420 }}
            className="mt-10 px-4"
          >
            <Text
              variant="body"
              className="text-ink-2 text-center"
              style={{ fontStyle: "italic", lineHeight: 22 }}
            >
              {`“${quote}”`}
            </Text>
          </MotiView>
        </View>
      </SafeAreaView>
    </View>
  );
}
