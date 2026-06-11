import React, { useState } from "react";
import { View, StatusBar, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import {
  ArrowLeft,
  MoreHorizontal,
  ShieldOff,
  ShieldCheck,
  Trash2,
  ChevronRight
} from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { TrainerForm } from "@/components/TrainerForm";
import { Button } from "@/components/Button";
import { Sheet } from "@/components/Sheet";
import { useData } from "@/store/data";
import { deleteTrainerFn, updateTrainerPasswordFn } from "@/lib/edgeFunctions";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";
import { friendlyError } from "@/lib/errors";

export default function EditTrainer() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const allTrainers = useData((s) => s.trainers);
  const updateTrainer = useData((s) => s.updateTrainer);
  const removeTrainerLocal = useData((s) => s.removeTrainerLocal);
  // Reactive lookup so updates flow into the form when needed
  const trainer = useData((s) =>
    id ? s.trainers.find((t) => t.id === id) : undefined
  );
  const [actionsOpen, setActionsOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  if (!trainer) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text variant="body" className="text-ink-2 text-center mb-4">
          Trainer not found.
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

  const onToggleActive = () => {
    setActionsOpen(false);
    const next = !trainer.isActive;
    Alert.alert(
      next ? "Reactivate trainer?" : "Deactivate trainer?",
      next
        ? `${trainer.name} will be able to sign in again.`
        : `${trainer.name} won't be able to sign in until reactivated. Their clients stay assigned.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: next ? "Reactivate" : "Deactivate",
          style: next ? "default" : "destructive",
          onPress: async () => {
            try {
              await updateTrainer(trainer.id, { isActive: next });
              haptics.success();
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't update", friendlyError(e));
            }
          }
        }
      ]
    );
  };

  const onDelete = () => {
    setActionsOpen(false);
    Alert.alert(
      "Delete trainer?",
      `${trainer.name} will be removed. Their clients will be unassigned. This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            if (busy) return;
            setBusy(true);
            try {
              await deleteTrainerFn(trainer.id);
              removeTrainerLocal(trainer.id);
              haptics.success();
              router.back();
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't delete", friendlyError(e));
            } finally {
              setBusy(false);
            }
          }
        }
      ]
    );
  };

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
            EDIT TRAINER
          </Text>
          <Pressable
            onPress={() => setActionsOpen(true)}
            className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03]"
          >
            <MoreHorizontal size={18} color={colors.ink} strokeWidth={2.2} />
          </Pressable>
        </View>

        <TrainerForm
          mode="edit"
          initial={trainer}
          submitLabel="Save Changes"
          takenMobiles={allTrainers
            .filter((t) => t.id !== trainer.id)
            .map((t) => t.mobile)}
          headerTitle={`Edit ${trainer.name.split(" ")[0]}`}
          headerSubtitle={
            trainer.isActive
              ? "Update details or change password. Use ⋯ to deactivate or delete."
              : "This account is deactivated — they can't sign in. Use ⋯ to reactivate."
          }
          onSubmit={async (data) => {
            if (busy) return;
            setBusy(true);
            try {
              // Profile fields → trainers table
              await updateTrainer(trainer.id, {
                name: data.name,
                mobile: data.mobile,
                age: data.age,
                gender: data.gender
              });
              // Optional password change → admin Edge Function
              if (data.password && data.password.length > 0) {
                await updateTrainerPasswordFn(trainer.id, data.password);
              }
              haptics.success();
              Alert.alert("Saved", "Trainer details updated.", [
                { text: "OK", onPress: () => router.back() }
              ]);
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't save", friendlyError(e));
            } finally {
              setBusy(false);
            }
          }}
        />
      </SafeAreaView>

      <Sheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={`Manage ${trainer.name.split(" ")[0]}`}
      >
        <View style={{ gap: 8 }}>
          <ActionRow
            icon={
              trainer.isActive ? (
                <ShieldOff size={16} color={colors.warn} strokeWidth={2.2} />
              ) : (
                <ShieldCheck
                  size={16}
                  color={colors.success}
                  strokeWidth={2.2}
                />
              )
            }
            label={trainer.isActive ? "Deactivate" : "Reactivate"}
            sub={
              trainer.isActive
                ? "Blocks sign-in. Keep their data."
                : "Allow sign-in again."
            }
            onPress={onToggleActive}
          />
          <ActionRow
            icon={<Trash2 size={16} color={colors.danger} strokeWidth={2.2} />}
            label="Delete trainer"
            sub="Permanently removes account. Their clients become unassigned."
            tone="danger"
            onPress={onDelete}
          />
        </View>
      </Sheet>
    </View>
  );
}

function ActionRow({
  icon,
  label,
  sub,
  onPress,
  tone = "neutral"
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onPress: () => void;
  tone?: "neutral" | "danger";
}) {
  return (
    <Pressable
      onPress={onPress}
      haptic="light"
      scaleTo={0.98}
      className={`flex-row items-center rounded-2xl border p-3.5 ${
        tone === "danger"
          ? "border-danger/25 bg-danger/[0.04]"
          : "border-line bg-surface"
      }`}
    >
      <View className="w-9 h-9 rounded-xl bg-white/[0.04] items-center justify-center mr-3">
        {icon}
      </View>
      <View className="flex-1">
        <Text
          variant="bodyMedium"
          className={tone === "danger" ? "text-danger" : "text-ink"}
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {label}
        </Text>
        {sub ? (
          <Text variant="caption" className="text-ink-3 mt-0.5">
            {sub}
          </Text>
        ) : null}
      </View>
      <ChevronRight size={16} color={colors.ink3} strokeWidth={2.2} />
    </Pressable>
  );
}
