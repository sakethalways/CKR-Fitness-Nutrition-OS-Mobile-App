import React, { useMemo, useState } from "react";
import { View, ScrollView, StatusBar, Share, Alert, Linking } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { buildWhatsAppPhone } from "@/data/countryCodes";
import { MotiView } from "moti";
import { ArrowLeft, FileText, MessageCircle, Check, Info } from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Avatar } from "@/components/Avatar";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { selectClient, selectPlan } from "@/store/data";
import { seedMeals } from "@/data/meals";
import { buildPlanHTML, buildWhatsAppText } from "@/lib/exports";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

export default function Approve() {
  const { planId } = useLocalSearchParams<{ planId: string }>();
  const insets = useSafeAreaInsets();

  const plan = useMemo(
    () => (planId ? selectPlan(planId) : undefined),
    [planId]
  );
  const client = useMemo(
    () => (plan ? selectClient(plan.clientId) : undefined),
    [plan]
  );

  const meals = useMemo(() => {
    if (!plan?.selectedMealIds) return [];
    return plan.selectedMealIds
      .map((id) => seedMeals.find((m) => m.id === Number(id)))
      .filter((m): m is NonNullable<typeof m> => Boolean(m));
  }, [plan]);

  const sections = useMemo(
    () => {
      const breakfast = meals.filter((m) => m.mealType === "Breakfast");
      const lunchDinner = meals.filter((m) => m.mealType === "Lunch / Dinner");
      return [
        { slot: "Breakfast", meals: breakfast },
        { slot: "Lunch / Dinner", meals: lunchDinner }
      ].filter((s) => s.meals.length > 0);
    },
    [meals]
  );

  const [pdfBusy, setPdfBusy] = useState(false);
  const [done, setDone] = useState(false);

  if (!plan || !client) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text variant="body" className="text-ink-2 text-center mb-4">
          Plan not found.
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const onPDF = async () => {
    try {
      setPdfBusy(true);
      const html = buildPlanHTML(client, sections, {
        low: plan.calorieRangeLow,
        high: plan.calorieRangeHigh
      });
      const { uri } = await Print.printToFileAsync({ html });
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          dialogTitle: "Share plan PDF",
          mimeType: "application/pdf",
          UTI: "com.adobe.pdf"
        });
        haptics.success();
      } else {
        Alert.alert("PDF ready", `Saved to: ${uri}`);
      }
    } catch (e) {
      haptics.warning();
      Alert.alert("Couldn't generate PDF", String(e));
    } finally {
      setPdfBusy(false);
    }
  };

  const onWhatsApp = async () => {
    const text = buildWhatsAppText(client, sections, {
      low: plan.calorieRangeLow,
      high: plan.calorieRangeHigh
    });

    // Direct-to-client if we have a phone number — opens the chat with text
    // pre-filled. Falls back to the system share sheet otherwise.
    const phone = buildWhatsAppPhone(
      client.phoneCountryCode,
      client.phoneNumber
    );
    if (phone) {
      const directUrl = `whatsapp://send?phone=${phone}&text=${encodeURIComponent(text)}`;
      const webUrl = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
      try {
        const can = await Linking.canOpenURL(directUrl);
        await Linking.openURL(can ? directUrl : webUrl);
        haptics.success();
        return;
      } catch {
        // fall through to share sheet on failure
      }
    }
    try {
      await Share.share({ message: text });
      haptics.success();
    } catch {
      haptics.warning();
    }
  };

  const onDone = () => {
    setDone(true);
    haptics.success();
    setTimeout(() => router.replace("/(app)/clients"), 500);
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
        <View className="flex-row items-center justify-between px-5 mt-2 mb-3">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03]"
          >
            <ArrowLeft size={18} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
          <Text variant="label" className="text-ink-3">
            APPROVE & EXPORT
          </Text>
          <View className="w-11 h-11" />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 120
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="flex-row items-center mb-5"
          >
            <Avatar initials={client.initials} size={44} tone="lime" />
            <View className="ml-3 flex-1">
              <Text variant="caption" className="text-ink-3">
                PLAN {plan.weekNumber} · ACTIVE
              </Text>
              <Text variant="h2" className="text-ink" numberOfLines={1}>
                {client.name}
              </Text>
              <Text variant="caption" className="text-ink-2" tabular>
                {plan.calorieRangeLow}–{plan.calorieRangeHigh} kcal/day ·{" "}
                {meals.length} meals
              </Text>
            </View>
          </MotiView>

          <MotiView
            from={{ opacity: 0, translateY: 12 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 18,
              stiffness: 200,
              delay: 80
            }}
          >
            <Text variant="label" className="text-ink-3 mb-3">
              EXPORT
            </Text>
            <View className="flex-row" style={{ gap: 10 }}>
              <ExportAction
                icon={
                  <FileText size={20} color={colors.lime} strokeWidth={2.2} />
                }
                title={pdfBusy ? "Generating…" : "Download PDF"}
                sub="Branded plan with all 8 options"
                onPress={onPDF}
                busy={pdfBusy}
              />
              <ExportAction
                icon={
                  <MessageCircle
                    size={20}
                    color={colors.success}
                    strokeWidth={2.2}
                  />
                }
                title="WhatsApp"
                sub="Send as plain text"
                onPress={onWhatsApp}
                tone="success"
              />
            </View>
          </MotiView>

          {/* Ratings info card — no UI here, it now lives on the plan in Client Profile */}
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{
              type: "spring",
              damping: 18,
              stiffness: 200,
              delay: 160
            }}
            className="mt-6 rounded-2xl border border-line bg-surface p-4"
          >
            <View className="flex-row items-center mb-1.5">
              <Info size={13} color={colors.lime} strokeWidth={2.4} />
              <Text variant="label" className="text-lime ml-1.5">
                RATING IS LATER
              </Text>
            </View>
            <Text variant="body" className="text-ink-2">
              After the client tries the meals for a week, open their profile →
              this plan → <Text variant="bodyMedium" className="text-ink" style={{ fontFamily: "Inter_600SemiBold" }}>Rate this plan</Text> to capture
              feedback. Ratings under 4 drop the meal from rotation; 8+
              prioritize for similar clients.
            </Text>
          </MotiView>
        </ScrollView>
      </SafeAreaView>

      <BottomBar>
        <Button
          label={done ? "Done · Returning…" : "Done"}
          size="lg"
          fullWidth
          iconLeft={
            done ? <Check size={16} color="#0A0B0D" strokeWidth={3} /> : null
          }
          disabled={done}
          onPress={onDone}
        />
      </BottomBar>
    </View>
  );
}

function ExportAction({
  icon,
  title,
  sub,
  onPress,
  busy,
  tone = "lime"
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  onPress: () => void;
  busy?: boolean;
  tone?: "lime" | "success";
}) {
  return (
    <Pressable
      onPress={busy ? undefined : onPress}
      scaleTo={0.97}
      haptic="medium"
      className="flex-1"
    >
      <View
        className={`rounded-2xl border p-4 ${
          tone === "lime"
            ? "bg-lime/10 border-lime/30"
            : "bg-success/10 border-success/30"
        } ${busy ? "opacity-60" : ""}`}
      >
        <View className="w-10 h-10 rounded-xl bg-white/[0.04] items-center justify-center mb-2.5">
          {icon}
        </View>
        <Text variant="h3" className="text-ink">
          {title}
        </Text>
        <Text variant="caption" className="text-ink-2 mt-0.5">
          {sub}
        </Text>
      </View>
    </Pressable>
  );
}
