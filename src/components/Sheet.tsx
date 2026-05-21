import React from "react";
import { Modal, View, Pressable as RNPressable, StyleSheet } from "react-native";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Text } from "./Text";

type Props = {
  visible: boolean;
  onClose: () => void;
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  /** if true, sheet wraps content; if false, allows full-height fill */
  compact?: boolean;
};

export function Sheet({
  visible,
  onClose,
  title,
  subtitle,
  children,
  compact = true
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      transparent
      visible={visible}
      onRequestClose={onClose}
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <RNPressable onPress={onClose} style={StyleSheet.absoluteFillObject} />
        <MotiView
          from={{ translateY: 300, opacity: 0 }}
          animate={{ translateY: 0, opacity: 1 }}
          transition={{
            type: "spring",
            damping: 22,
            stiffness: 260,
            mass: 0.7
          }}
          style={[
            styles.sheet,
            {
              paddingBottom: insets.bottom + 12,
              maxHeight: compact ? "85%" : "92%"
            }
          ]}
        >
          <View style={styles.handle} />
          {title ? (
            <View style={{ paddingHorizontal: 20, paddingTop: 14 }}>
              <Text variant="h3" className="text-ink">
                {title}
              </Text>
              {subtitle ? (
                <Text variant="caption" className="text-ink-2 mt-1">
                  {subtitle}
                </Text>
              ) : null}
            </View>
          ) : null}
          <View style={{ paddingHorizontal: 20, paddingTop: title ? 16 : 8 }}>
            {children}
          </View>
        </MotiView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end"
  },
  sheet: {
    backgroundColor: "#0F1115",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(255,255,255,0.08)"
  },
  handle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(255,255,255,0.18)",
    marginTop: 8
  }
});
