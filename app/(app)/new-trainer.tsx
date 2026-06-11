import React, { useState } from "react";
import { View, StatusBar, Alert } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { TrainerForm } from "@/components/TrainerForm";
import { useData } from "@/store/data";
import { createTrainerFn } from "@/lib/edgeFunctions";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";
import { friendlyError } from "@/lib/errors";

export default function NewTrainer() {
  const trainers = useData((s) => s.trainers);
  const [busy, setBusy] = useState(false);

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#11160B", "#0A0B0D", "#0A0B0D"]}
        locations={[0, 0.35, 1]}
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
            NEW TRAINER
          </Text>
          <View className="w-11 h-11" />
        </View>

        <TrainerForm
          mode="create"
          submitLabel={busy ? "Creating…" : "Create Trainer"}
          takenMobiles={trainers.map((t) => t.mobile)}
          headerTitle="Add a trainer"
          headerSubtitle="They sign in using their mobile + the password you set."
          onSubmit={async (data) => {
            if (busy) return;
            setBusy(true);
            try {
              await createTrainerFn({
                name: data.name,
                mobile: data.mobile,
                age: data.age,
                gender: data.gender,
                password: data.password
              });
              haptics.success();
              Alert.alert(
                "Trainer created",
                `${data.name} can now sign in with mobile ${data.mobile} and the password you set.`,
                [{ text: "OK", onPress: () => router.back() }]
              );
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't create trainer", friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </SafeAreaView>
    </View>
  );
}
