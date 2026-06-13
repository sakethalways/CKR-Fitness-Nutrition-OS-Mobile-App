import React from "react";
import { View, Image } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "./Text";

type Props = {
  initials: string;
  size?: number;
  tone?: "lime" | "neutral";
  ring?: boolean;
  /** Optional image URI — falls back to initials if not set */
  imageUri?: string;
};

export function Avatar({
  initials,
  size = 44,
  tone = "neutral",
  ring,
  imageUri
}: Props) {
  const gradient: [string, string] =
    tone === "lime" ? ["#FE7F0B", "#D96A05"] : ["#1F232B", "#15181E"];
  const textColor = tone === "lime" ? "#0A0B0D" : "#FFFFFF";

  const content = imageUri ? (
    <Image
      source={{ uri: imageUri }}
      style={{
        width: "100%",
        height: "100%",
        borderRadius: size / 2
      }}
      resizeMode="cover"
    />
  ) : (
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={{
        flex: 1,
        borderRadius: size / 2,
        alignItems: "center",
        justifyContent: "center",
        borderWidth: tone === "neutral" ? 1 : 0,
        borderColor: "rgba(255,255,255,0.08)"
      }}
    >
      <Text
        style={{
          fontFamily: "Inter_700Bold",
          fontSize: size * 0.36,
          color: textColor,
          letterSpacing: -0.3
        }}
      >
        {initials}
      </Text>
    </LinearGradient>
  );

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        padding: ring ? 2 : 0,
        backgroundColor: ring ? "rgba(254,127,11,0.35)" : "transparent",
        overflow: "hidden"
      }}
    >
      {content}
    </View>
  );
}
