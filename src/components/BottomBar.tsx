import React from "react";
import { View, Platform } from "react-native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type Props = {
  children: React.ReactNode;
  /** Add clearance for the bottom tab bar (use on tab screens) */
  tabSafe?: boolean;
};

const TAB_BAR_HEIGHT = Platform.OS === "ios" ? 86 : 74;

export function BottomBar({ children, tabSafe = false }: Props) {
  const insets = useSafeAreaInsets();
  const bottomOffset = tabSafe ? TAB_BAR_HEIGHT : 0;
  const padBottom = tabSafe ? 12 : Math.max(insets.bottom, 14);

  return (
    <View
      style={{
        position: "absolute",
        bottom: bottomOffset,
        left: 0,
        right: 0,
        paddingHorizontal: 20,
        paddingTop: 14,
        paddingBottom: padBottom
      }}
      pointerEvents="box-none"
    >
      {/*
       * On stack screens (no tab bar): show the standard gradient + blur so
       * scroll content fades cleanly behind the CTA.
       * On tab screens (tabSafe=true): no backdrop — the tab bar already
       * handles the visual transition. Avoids the floating "black box"
       * that was appearing behind the button.
       */}
      {!tabSafe ? (
        <>
          <LinearGradient
            colors={["rgba(10,11,13,0)", "rgba(10,11,13,0.85)", "#0A0B0D"]}
            locations={[0, 0.5, 1]}
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              bottom: 0
            }}
            pointerEvents="none"
          />
          {Platform.OS === "ios" ? (
            <BlurView
              intensity={30}
              tint="dark"
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0
              }}
              pointerEvents="none"
            />
          ) : null}
        </>
      ) : (
        // Very subtle top edge fade so the button doesn't sit flush against
        // a hard line — but transparent enough that no "box" is visible.
        <LinearGradient
          colors={["rgba(10,11,13,0)", "rgba(10,11,13,0.55)"]}
          locations={[0, 1]}
          style={{
            position: "absolute",
            top: -20,
            left: 0,
            right: 0,
            height: 30
          }}
          pointerEvents="none"
        />
      )}
      {children}
    </View>
  );
}
