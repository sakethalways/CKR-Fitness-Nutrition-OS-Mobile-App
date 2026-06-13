import React, { useEffect, useMemo, useState } from "react";
import { View, ScrollView, StatusBar, KeyboardAvoidingView, Platform } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import {
  ArrowLeft,
  Flame,
  Activity,
  TrendingDown,
  TrendingUp,
  Target,
  Settings2
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/Avatar";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { Stepper } from "@/components/Stepper";
import { MacroBar } from "@/components/MacroBar";
import { AnimatedNumber } from "@/components/AnimatedNumber";
import { selectClient, useData } from "@/store/data";
import { calculateAuto, macrosFromTarget } from "@/lib/calc";
import { genderLabel } from "@/lib/format";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";
import { friendlyError } from "@/lib/errors";

export default function Generate() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const insets = useSafeAreaInsets();
  const client = useMemo(
    () => (clientId ? selectClient(clientId) : undefined),
    [clientId]
  );
  const updateClient = useData((s) => s.updateClient);

  const [target, setTarget] = useState(0);
  const [protein, setProtein] = useState(0);

  const auto = useMemo(() => {
    if (!client) return null;
    return calculateAuto({
      age: client.age,
      gender: client.gender,
      weight: client.weight,
      height: client.height,
      activity: client.activityLevel,
      goal: client.goal
    });
  }, [client]);

  useEffect(() => {
    if (auto) {
      setTarget(auto.target);
      setProtein(auto.protein);
    }
  }, [auto]);

  if (!client || !auto) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text variant="body" className="text-ink-2 text-center mb-4">
          Client not found.
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  // Fields are always editable; macros derive from the current target/protein.
  // When untouched these equal the auto values (identical formulas in calc.ts).
  const macros = macrosFromTarget(target, client.weight, client.goal, protein);
  const isCustom = target !== auto.target || protein !== auto.protein;
  // BMR/TDEE are physiology — they never change with manual adjustments. The
  // DEFICIT is target − TDEE, so it must follow the CURRENT target live
  // (manually setting 1800 with TDEE 2441 is a −641 deficit, not −400).
  const liveDelta = target - auto.tdee;

  const onContinue = async () => {
    try {
      await updateClient(client.id, {
        calorieTarget: target,
        proteinTarget: macros.protein
      });
      haptics.success();
      router.push(`/(app)/meals?clientId=${client.id}`);
    } catch (e: any) {
      haptics.warning();
      const { Alert } = await import("react-native");
      Alert.alert("Couldn't save targets", friendlyError(e));
    }
  };

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#11160B", "#0A0B0D", "#0A0B0D"]}
        locations={[0, 0.4, 1]}
        style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 0 }}
      />
      <SafeAreaView edges={["top"]} className="flex-1">
        {/* Header */}
        <View className="flex-row items-center justify-between px-5 mt-2 mb-3">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03]"
          >
            <ArrowLeft size={18} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <Text variant="label" className="text-ink-3">
            CALCULATOR
          </Text>
          <View className="w-11 h-11" />
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
        >
          <ScrollView
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              paddingHorizontal: 20,
              paddingBottom: insets.bottom + 120
            }}
          >
            {/* Client mini-header */}
            <MotiView
              from={{ opacity: 0, translateY: 10 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 180 }}
              className="flex-row items-center mb-6"
            >
              <Avatar initials={client.initials} size={48} tone="lime" />
              <View className="ml-3 flex-1">
                <Text variant="caption" className="text-ink-3">
                  CALCULATING FOR
                </Text>
                <Text variant="h2" className="text-ink" numberOfLines={1}>
                  {client.name}
                </Text>
                <Text variant="caption" className="text-ink-2" tabular>
                  {client.age} yrs · {genderLabel(client.gender)} · {client.weight}kg ·{" "}
                  {client.height}cm · {client.goal}
                </Text>
              </View>
            </MotiView>

            {/* Hero target card */}
            <MotiView
              from={{ opacity: 0, scale: 0.97, translateY: 12 }}
              animate={{ opacity: 1, scale: 1, translateY: 0 }}
              transition={{
                type: "spring",
                damping: 18,
                stiffness: 180,
                delay: 80
              }}
            >
              <View className="rounded-2xl border border-lime/30 bg-lime/10 overflow-hidden">
                <LinearGradient
                  colors={["rgba(254,127,11,0.18)", "rgba(254,127,11,0.02)"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0
                  }}
                />
                <View className="p-4">
                  <View className="flex-row items-center mb-1">
                    <Target size={14} color={colors.lime} strokeWidth={2.4} />
                    <Text variant="label" className="text-lime ml-1.5">
                      DAILY CALORIE TARGET
                    </Text>
                  </View>
                  <View className="flex-row items-baseline mt-1">
                    <AnimatedNumber
                      value={target}
                      style={{
                        fontSize: 38,
                        lineHeight: 44,
                        letterSpacing: -1,
                        color: "#FFA94D",
                        fontFamily: "Inter_700Bold"
                      }}
                    />
                    <Text variant="caption" className="text-ink-2 ml-2">
                      kcal / day
                    </Text>
                  </View>
                  <Text variant="caption" className="text-ink-2 mt-1" tabular>
                    Acceptable band ±5% · {Math.round(target * 0.95)}–
                    {Math.round(target * 1.05)} kcal
                  </Text>
                </View>
              </View>
            </MotiView>

            {/* Auto-calculated breakdown */}
            <Card delay={160} className="mt-4">
              <View className="flex-row items-center mb-3">
                <Activity size={13} color={colors.ink3} strokeWidth={2.4} />
                <Text variant="label" className="text-ink-3 ml-1.5">
                  AUTO-CALCULATED · MIFFLIN-ST JEOR
                </Text>
              </View>

              <CalcRow
                icon={<Flame size={14} color={colors.ink2} strokeWidth={2.4} />}
                label="BMR"
                value={auto.bmr}
                hint={`${client.weight}kg · ${client.height}cm · ${client.age}y · ${genderLabel(client.gender)}`}
              />
              <Divider />
              <CalcRow
                icon={<Activity size={14} color={colors.ink2} strokeWidth={2.4} />}
                label="TDEE"
                value={auto.tdee}
                hint={`× ${client.activityLevel}`}
              />
              <Divider />
              <CalcRow
                icon={
                  liveDelta < 0 ? (
                    <TrendingDown
                      size={14}
                      color={colors.warn}
                      strokeWidth={2.4}
                    />
                  ) : liveDelta > 0 ? (
                    <TrendingUp
                      size={14}
                      color={colors.success}
                      strokeWidth={2.4}
                    />
                  ) : (
                    <Target size={14} color={colors.ink2} strokeWidth={2.4} />
                  )
                }
                label={
                  liveDelta < 0
                    ? "Deficit"
                    : liveDelta > 0
                    ? "Surplus"
                    : "Maintain"
                }
                value={liveDelta}
                signed
                hint={
                  isCustom
                    ? "From your adjusted target vs TDEE"
                    : `Goal: ${client.goal}`
                }
              />
              <Divider />
              <CalcRow
                icon={<Target size={14} color={colors.lime} strokeWidth={2.4} />}
                label="Auto Target"
                value={auto.target}
                accent
              />
            </Card>

            {/* Adjust targets — always editable. Tap +/-, or type a value.
                "Reset to auto" restores the calculated numbers. */}
            <Card delay={240} className="mt-4">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Settings2
                    size={13}
                    color={isCustom ? colors.lime : colors.ink3}
                    strokeWidth={2.4}
                  />
                  <Text
                    variant="label"
                    className={isCustom ? "text-lime ml-1.5" : "text-ink-3 ml-1.5"}
                  >
                    {isCustom ? "ADJUSTED TARGETS" : "ADJUST TARGETS"}
                  </Text>
                </View>
                {isCustom ? (
                  <Pressable
                    onPress={() => {
                      setTarget(auto.target);
                      setProtein(auto.protein);
                      haptics.tap();
                    }}
                    hitSlop={10}
                    className="px-2.5 py-1 rounded-full border border-line bg-white/[0.04]"
                  >
                    <Text variant="caption" className="text-ink-2">
                      Reset to auto
                    </Text>
                  </Pressable>
                ) : null}
              </View>

              <View className="flex-row" style={{ gap: 8 }}>
                <Stepper
                  label="Calories"
                  value={target}
                  onChange={setTarget}
                  min={1000}
                  max={5000}
                  step={50}
                  suffix="kcal"
                />
                <Stepper
                  label="Protein"
                  value={protein}
                  onChange={setProtein}
                  min={40}
                  max={300}
                  step={5}
                  suffix="g"
                />
              </View>
            </Card>

            {/* Macros breakdown */}
            <Card delay={320} className="mt-4">
              <Text variant="label" className="text-ink-3 mb-3">
                MACROS · {target} KCAL
              </Text>
              <MacroBar
                protein={macros.protein}
                carbs={macros.carbs}
                fat={macros.fat}
              />
            </Card>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <BottomBar>
        <Button
          label="Generate Meal Options"
          size="lg"
          fullWidth
          onPress={onContinue}
        />
      </BottomBar>
    </View>
  );
}

function CalcRow({
  icon,
  label,
  value,
  hint,
  signed,
  accent
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  hint?: string;
  signed?: boolean;
  accent?: boolean;
}) {
  const display = signed
    ? `${value > 0 ? "+" : value < 0 ? "" : "±"}${value}`
    : `${value}`;
  return (
    <View className="flex-row items-center py-2.5">
      <View className="w-7 h-7 rounded-full bg-white/[0.04] items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text
          variant="bodyMedium"
          className={accent ? "text-lime" : "text-ink"}
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {label}
        </Text>
        {hint ? (
          <Text variant="caption" className="text-ink-3 mt-0.5">
            {hint}
          </Text>
        ) : null}
      </View>
      <View className="flex-row items-baseline">
        <Text
          tabular
          style={{
            fontFamily: "Inter_700Bold",
            fontSize: 17,
            color: accent ? "#FFA94D" : "#FFFFFF",
            letterSpacing: -0.3
          }}
        >
          {display}
        </Text>
        <Text variant="caption" className="text-ink-3 ml-1">
          kcal
        </Text>
      </View>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-line my-0.5" />;
}
