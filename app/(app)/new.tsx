import React from "react";
import { View, StatusBar } from "react-native";
import { router } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { ClientForm } from "@/components/ClientForm";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import { useNotifications } from "@/store/notifications";
import { getAdminId } from "@/lib/admin";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";
import { Alert } from "react-native";

export default function NewClient() {
  const user = useAuth((s) => s.user)!;
  const addClient = useData((s) => s.addClient);
  const pushNotification = useNotifications((s) => s.safePush);
  const trainer = user.role === "trainer" ? user.trainer : null;

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
            NEW CLIENT
          </Text>
          <View className="w-11 h-11" />
        </View>

        <ClientForm
          headerTitle="Client details"
          headerSubtitle="Fill once. You can update any field later from the client's profile."
          submitLabel="Continue to Calculator"
          onSubmit={async (data) => {
            if (!trainer) return;
            try {
              const created = await addClient({
                trainerId: trainer.id,
                lastPlanDate: undefined,
                ...data
              });
              const adminId = await getAdminId();
              if (adminId) {
                await pushNotification({
                  recipientRole: "admin",
                  recipientId: adminId,
                  kind: "new_client",
                  title: "New client added",
                  body: `${trainer.name.split(" ")[0]} added ${created.name}.`,
                  payload: { clientId: created.id, trainerId: trainer.id }
                });
              }
              haptics.success();
              router.replace(`/(app)/generate?clientId=${created.id}`);
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't save client", e?.message ?? String(e));
            }
          }}
        />
      </SafeAreaView>
    </View>
  );
}
