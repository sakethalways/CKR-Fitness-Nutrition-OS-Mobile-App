import React, { useEffect, useState } from "react";
import { View, KeyboardAvoidingView, Platform } from "react-native";
import { MotiView } from "moti";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Phone, ArrowRight } from "lucide-react-native";
import { Screen } from "@/components/Screen";
import { Text } from "@/components/Text";
import { Input } from "@/components/Input";
import { Button } from "@/components/Button";
import { Logo } from "@/components/Logo";
import { SegmentedControl } from "@/components/SegmentedControl";
import { useAuth } from "@/store/auth";
import { friendlyError } from "@/lib/errors";
import * as haptics from "@/lib/haptics";
import { colors } from "@/theme/tokens";

type Mode = "trainer" | "admin";

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>("trainer");
  const [mobile, setMobile] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const signInTrainer = useAuth((s) => s.signInTrainer);
  const signInAdmin = useAuth((s) => s.signInAdmin);
  const user = useAuth((s) => s.user);

  // If a session is recovered late (e.g. a slow token refresh resolved after
  // we'd already routed here), navigate into the app instead of stranding the
  // already-signed-in user on the login screen.
  useEffect(() => {
    if (user) {
      router.replace(user.role === "admin" ? "/overview" : "/clients");
    }
  }, [user]);

  const onSubmit = async () => {
    setError(null);
    try {
      setLoading(true);
      if (mode === "trainer") {
        await signInTrainer(mobile, password);
        haptics.success();
        router.replace("/clients");
      } else {
        await signInAdmin(password);
        haptics.success();
        router.replace("/overview");
      }
    } catch (e: any) {
      setError(friendlyError(e, "Couldn't sign in. Please try again."));
      haptics.warning();
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen scroll={false} padded={false} gradient={false}>
      <LinearGradient
        colors={["#1A2008", "#0A0B0D", "#0A0B0D"]}
        locations={[0, 0.45, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <MotiView
        from={{ opacity: 0, scale: 0.6 }}
        animate={{ opacity: 0.35, scale: 1 }}
        transition={{ type: "timing", duration: 1000 }}
        style={{
          position: "absolute",
          top: -120,
          alignSelf: "center",
          width: 380,
          height: 380,
          borderRadius: 200,
          backgroundColor: colors.lime,
          opacity: 0.18
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <View className="flex-1 px-6 justify-between pt-16 pb-8">
          <View className="items-center">
            <Logo size={104} />
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 400, delay: 150 }}
              className="items-center mt-5"
            >
              <Text variant="display" className="text-ink text-center">
                Nutrition OS
              </Text>
              <Text variant="caption" className="text-ink-2 text-center mt-1.5">
                Trainer command center
              </Text>
            </MotiView>
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 16 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 18,
              stiffness: 180,
              delay: 280
            }}
          >
            {/* Role segmented */}
            <SegmentedControl<Mode>
              value={mode}
              onChange={(m) => {
                setMode(m);
                setError(null);
                setPassword("");
              }}
              options={[
                { value: "trainer", label: "Trainer" },
                { value: "admin", label: "Admin" }
              ]}
            />

            <View className="gap-3 mt-4">
              {mode === "trainer" ? (
                <Input
                  label="Mobile Number"
                  placeholder="10-digit mobile"
                  value={mobile}
                  onChangeText={(t) => setMobile(t.replace(/\D/g, "").slice(0, 10))}
                  keyboardType="number-pad"
                  autoCapitalize="none"
                  autoCorrect={false}
                  iconLeft={
                    <Phone size={16} color={colors.ink2} strokeWidth={2} />
                  }
                />
              ) : null}
              <Input
                label="Password"
                placeholder="Enter password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                autoCapitalize="none"
                autoCorrect={false}
                autoComplete="off"
                textContentType="password"
                error={error ?? undefined}
                iconLeft={
                  <Lock size={16} color={colors.ink2} strokeWidth={2} />
                }
              />

              <View className="mt-1">
                <Button
                  label={loading ? "Signing in..." : "Sign In"}
                  onPress={onSubmit}
                  loading={loading}
                  size="lg"
                  fullWidth
                  iconRight={
                    !loading ? (
                      <ArrowRight size={16} color="#0A0B0D" strokeWidth={2.5} />
                    ) : null
                  }
                />
              </View>
            </View>
          </MotiView>

          <View className="items-center">
            <Text variant="caption" className="text-ink-4 text-center">
              {mode === "trainer"
                ? "Use the mobile + password your admin shared with you."
                : "Sign in to the CKR Admin console."}
            </Text>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}
