import React from "react";
import { View, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";

type Props = {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  gradient?: boolean;
  edges?: ("top" | "bottom" | "left" | "right")[];
  contentClassName?: string;
};

export function Screen({
  children,
  scroll = true,
  padded = true,
  gradient = true,
  edges = ["top"],
  contentClassName = ""
}: Props) {
  const insets = useSafeAreaInsets();
  const Wrapper = scroll ? ScrollView : View;
  const wrapProps = scroll
    ? {
        contentContainerStyle: {
          paddingHorizontal: padded ? 20 : 0,
          paddingBottom: insets.bottom + 32,
          paddingTop: 4
        },
        showsVerticalScrollIndicator: false,
        keyboardShouldPersistTaps: "handled" as const
      }
    : {
        style: {
          flex: 1,
          paddingHorizontal: padded ? 20 : 0,
          paddingBottom: insets.bottom + 16
        }
      };

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />
      {gradient ? (
        <LinearGradient
          colors={["#0F1115", "#0A0B0D", "#0A0B0D"]}
          locations={[0, 0.55, 1]}
          style={{ position: "absolute", inset: 0 as any, top: 0, left: 0, right: 0, bottom: 0 }}
        />
      ) : null}
      <SafeAreaView edges={edges} className="flex-1">
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <Wrapper className={contentClassName} {...(wrapProps as any)}>
            {children}
          </Wrapper>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}
