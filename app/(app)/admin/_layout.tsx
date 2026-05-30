import { View } from "react-native";
import { Stack, useRouter } from "expo-router";
import { useAuth } from "@/store/auth";
import { Text } from "@/components/Text";
import { Button } from "@/components/Button";

export default function AdminLayout() {
  const user = useAuth((s) => s.user);
  const router = useRouter();

  // Only admins can access admin routes
  if (!user || user.role !== "admin") {
    return (
      <View className="flex-1 bg-bg items-center justify-center px-6">
        <View className="items-center">
          <Text variant="h2" className="text-ink mb-2">
            Admin Only
          </Text>
          <Text variant="body" className="text-ink-2 text-center mb-6">
            This section is restricted to administrators.
          </Text>
          <Button
            label="Go Back"
            variant="primary"
            onPress={() => router.back()}
          />
        </View>
      </View>
    );
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
