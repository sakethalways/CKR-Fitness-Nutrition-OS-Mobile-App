import React, { useEffect, useState } from "react";
import { Modal, View, ActivityIndicator } from "react-native";
import * as Updates from "expo-updates";
import { Sparkles } from "lucide-react-native";
import { Text } from "./Text";
import { Pressable } from "./Pressable";
import { colors } from "@/theme/tokens";

/**
 * Over-the-air update prompt. On app open we ask Expo's update server whether
 * a newer JS bundle exists for this build's channel; if so, show a friendly
 * "New features available" card. "Update now" downloads the bundle and
 * restarts the app on the new version — no APK reinstall, no link, no QR.
 *
 * Native changes (new libraries / app config) still ship as a new APK; this
 * only covers JS/UI/logic updates, which is the overwhelming majority.
 */
// Pull the release notes out of the INCOMING update's manifest. The app config
// (app.json "extra") is embedded into every published update, so whatever
// `extra.whatsNew` said at `eas update` time is what users see here — edit
// that list in app.json before each publish.
const notesFromManifest = (manifest: unknown): string[] => {
  const wn = (manifest as any)?.extra?.expoClient?.extra?.whatsNew;
  if (Array.isArray(wn)) return wn.map(String).filter(Boolean).slice(0, 6);
  if (typeof wn === "string" && wn.trim()) {
    return wn
      .split("\n")
      .map((s) => s.replace(/^[-•*]\s*/, "").trim())
      .filter(Boolean)
      .slice(0, 6);
  }
  return [];
};

export function UpdatePrompt() {
  const [visible, setVisible] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [failed, setFailed] = useState(false);
  const [notes, setNotes] = useState<string[]>([]);

  useEffect(() => {
    // Updates are disabled in dev / Expo Go — checking there throws.
    if (__DEV__ || !Updates.isEnabled) return;
    let cancelled = false;
    (async () => {
      try {
        const result = await Updates.checkForUpdateAsync();
        if (!cancelled && result.isAvailable) {
          setNotes(notesFromManifest(result.manifest));
          setVisible(true);
        }
      } catch {
        // Offline or server hiccup — stay quiet; we'll check next open.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onUpdate = async () => {
    if (updating) return;
    setUpdating(true);
    setFailed(false);
    try {
      await Updates.fetchUpdateAsync();
      await Updates.reloadAsync(); // restarts straight into the new version
    } catch {
      setUpdating(false);
      setFailed(true);
    }
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" statusBarTranslucent>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.7)",
          alignItems: "center",
          justifyContent: "center",
          padding: 24
        }}
      >
        <View
          className="w-full rounded-2xl border border-lime/30 bg-surface p-5"
          style={{ maxWidth: 360 }}
        >
          <View className="w-12 h-12 rounded-full bg-lime/15 items-center justify-center mb-3">
            <Sparkles size={22} color={colors.lime} strokeWidth={2.2} />
          </View>
          <Text variant="h2" className="text-ink mb-1">
            New features available
          </Text>
          <Text variant="body" className="text-ink-2 mb-3">
            A new version of the app is ready. Update takes a few seconds and
            the app will restart — your data is safe.
          </Text>

          {notes.length > 0 ? (
            <View className="rounded-xl bg-lime/10 border border-lime/20 px-3 py-2.5 mb-4">
              <Text
                variant="caption"
                className="text-lime mb-1"
                style={{ fontFamily: "Inter_600SemiBold", letterSpacing: 0.6 }}
              >
                WHAT'S NEW
              </Text>
              {notes.map((n, i) => (
                <Text key={i} variant="caption" className="text-ink-2">
                  {`•  ${n}`}
                </Text>
              ))}
            </View>
          ) : null}

          {failed ? (
            <Text variant="caption" className="text-danger mb-3">
              Couldn't download the update. Check your internet and try again.
            </Text>
          ) : null}

          <Pressable
            onPress={onUpdate}
            disabled={updating}
            className={`h-12 rounded-xl items-center justify-center ${
              updating ? "bg-lime/50" : "bg-lime"
            }`}
          >
            {updating ? (
              <View className="flex-row items-center">
                <ActivityIndicator size="small" color="#0A0B0D" />
                <Text
                  variant="bodyMedium"
                  className="text-black ml-2"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  Updating…
                </Text>
              </View>
            ) : (
              <Text
                variant="bodyMedium"
                className="text-black"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Update now
              </Text>
            )}
          </Pressable>

          <Pressable
            onPress={() => setVisible(false)}
            disabled={updating}
            className="h-11 items-center justify-center mt-2"
          >
            <Text variant="bodyMedium" className="text-ink-3">
              Later
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}
