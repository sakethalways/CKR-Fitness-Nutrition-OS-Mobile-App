import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { Text } from "./Text";

type Props = { size?: number; animate?: boolean };

export function Logo({ size = 56, animate = true }: Props) {
  return (
    <View className="items-center">
      <MotiView
        from={animate ? { scale: 0.6, opacity: 0, rotate: "-10deg" } : undefined}
        animate={{ scale: 1, opacity: 1, rotate: "0deg" }}
        transition={{ type: "spring", damping: 14, stiffness: 200 }}
        style={{
          width: size,
          height: size,
          borderRadius: size * 0.28,
          backgroundColor: "#C6F432",
          alignItems: "center",
          justifyContent: "center",
          shadowColor: "#C6F432",
          shadowOpacity: 0.45,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 }
        }}
      >
        <Text
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: size * 0.42,
            color: "#0A0B0D",
            letterSpacing: -1
          }}
        >
          C
        </Text>
      </MotiView>
    </View>
  );
}
