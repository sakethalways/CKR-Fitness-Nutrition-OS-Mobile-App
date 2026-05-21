import React from "react";
import { View, Image } from "react-native";
import { MotiView } from "moti";

const LOGO_SOURCE = require("../../assets/logo.png");

type Props = {
  size?: number;
  animate?: boolean;
  rounded?: boolean;
};

export function Logo({ size = 56, animate = true, rounded = true }: Props) {
  const radius = rounded ? size * 0.22 : 0;
  return (
    <View className="items-center">
      <MotiView
        from={animate ? { scale: 0.6, opacity: 0, rotate: "-10deg" } : undefined}
        animate={{ scale: 1, opacity: 1, rotate: "0deg" }}
        transition={{ type: "spring", damping: 14, stiffness: 200 }}
        style={{
          width: size,
          height: size,
          borderRadius: radius,
          overflow: "hidden",
          backgroundColor: "#000",
          shadowColor: "#C6F432",
          shadowOpacity: 0.25,
          shadowRadius: 24,
          shadowOffset: { width: 0, height: 0 }
        }}
      >
        <Image
          source={LOGO_SOURCE}
          style={{ width: size, height: size }}
          resizeMode="cover"
        />
      </MotiView>
    </View>
  );
}
