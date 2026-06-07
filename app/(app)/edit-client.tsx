import React, { useRef } from "react";
import { View, StatusBar, Alert } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { ArrowLeft } from "lucide-react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { ClientForm } from "@/components/ClientForm";
import { Button } from "@/components/Button";
import { selectClient, useData } from "@/store/data";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

export default function EditClient() {
  const { clientId } = useLocalSearchParams<{ clientId: string }>();
  const updateClient = useData((s) => s.updateClient);
  // Subscribe so the client is found once it loads…
  useData((s) => s.clients);

  // …but snapshot it the first time it's available, so realtime updates can't
  // re-feed the form mid-edit and stomp on values the user is typing.
  const live = clientId ? selectClient(clientId) : undefined;
  const snapshot = useRef<typeof live>(undefined);
  if (live && !snapshot.current) snapshot.current = live;
  const client = snapshot.current;

  if (!client) {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <Text variant="body" className="text-ink-2 text-center mb-4">
          Client not found.
        </Text>
        <Button label="Back" variant="ghost" onPress={() => router.back()} />
      </View>
    );
  }

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
            EDIT CLIENT
          </Text>
          <View className="w-11 h-11" />
        </View>

        <ClientForm
          initial={client}
          headerTitle="Edit details"
          headerSubtitle="Fix typos or update weight/notes — changes save instantly."
          submitLabel="Save Changes"
          onSubmit={async (data) => {
            try {
              await updateClient(client.id, data);
              haptics.success();
              Alert.alert("Saved", "Client details updated.", [
                { text: "OK", onPress: () => router.back() }
              ]);
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't save", e?.message ?? String(e));
            }
          }}
        />
      </SafeAreaView>
    </View>
  );
}
