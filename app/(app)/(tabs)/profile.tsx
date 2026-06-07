import React from "react";
import {
  View,
  ScrollView,
  StatusBar,
  Alert,
  Platform,
  ActivityIndicator
} from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import {
  LogOut,
  Phone,
  Calendar,
  User2,
  ShieldCheck,
  Camera,
  Trash2,
  ChefHat,
  ArrowRight
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as ImagePicker from "expo-image-picker";
import { uploadAvatar, deleteAvatar } from "@/lib/storage";
import { Text } from "@/components/Text";
import { Avatar } from "@/components/Avatar";
import { Logo } from "@/components/Logo";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { Pressable } from "@/components/Pressable";
import { Sheet } from "@/components/Sheet";
import { useAuth } from "@/store/auth";
import { useData } from "@/store/data";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

export default function Profile() {
  const user = useAuth((s) => s.user)!;
  const signOut = useAuth((s) => s.signOut);
  const insets = useSafeAreaInsets();
  const updateTrainer = useData((s) => s.updateTrainer);

  // Reactive — avatar updates land instantly without remount
  const trainer = useData((s) =>
    user.role === "trainer"
      ? s.trainers.find((t) => t.id === user.trainer.id)
      : undefined
  );

  const [picOpen, setPicOpen] = React.useState(false);
  const [signingOut, setSigningOut] = React.useState(false);

  const pickFromLibrary = async () => {
    setPicOpen(false);
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission required",
          "Allow photo library access in settings to update your picture."
        );
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7
      });
      if (!result.canceled && result.assets[0] && trainer) {
        const publicUrl = await uploadAvatar(trainer.id, result.assets[0].uri);
        await updateTrainer(trainer.id, { avatarUri: publicUrl });
        haptics.success();
      }
    } catch (e) {
      Alert.alert("Couldn't upload image", String(e));
    }
  };

  const takePhoto = async () => {
    setPicOpen(false);
    try {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        Alert.alert(
          "Permission required",
          "Allow camera access in settings to take a new picture."
        );
        return;
      }
      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7
      });
      if (!result.canceled && result.assets[0] && trainer) {
        const publicUrl = await uploadAvatar(trainer.id, result.assets[0].uri);
        await updateTrainer(trainer.id, { avatarUri: publicUrl });
        haptics.success();
      }
    } catch (e) {
      Alert.alert("Couldn't upload photo", String(e));
    }
  };

  const removePic = async () => {
    setPicOpen(false);
    if (!trainer) return;
    try {
      await deleteAvatar(trainer.id);
      await updateTrainer(trainer.id, { avatarUri: undefined });
      haptics.success();
    } catch (e) {
      Alert.alert("Couldn't remove picture", String(e));
    }
  };

  const confirmSignOut = () => {
    Alert.alert("Sign out?", "You'll be returned to the login screen.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign out",
        style: "destructive",
        onPress: async () => {
          setSigningOut(true);
          try {
            await signOut();
            router.replace("/login");
          } catch {
            setSigningOut(false);
          }
        }
      }
    ]);
  };

  const hasPic = Boolean(trainer?.avatarUri);

  if (signingOut) {
    return (
      <View className="flex-1 bg-bg items-center justify-center">
        <ActivityIndicator color={colors.lime} />
        <Text variant="caption" className="text-ink-3 mt-3">
          Signing out…
        </Text>
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 110,
            paddingTop: 4
          }}
        >
          <View className="mt-2 mb-6">
            <Text variant="caption" className="text-ink-3">
              YOU
            </Text>
            <Text variant="h1" className="text-ink">
              Profile
            </Text>
          </View>

          <MotiView
            from={{ opacity: 0, translateY: 8 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="items-center mb-5"
          >
            {user.role === "admin" ? (
              // Admin has no profile photo — show the brand logo instead of
              // the "CA" initials avatar.
              <Logo size={88} animate={false} />
            ) : (
              <Pressable
                onPress={() => trainer && setPicOpen(true)}
                haptic="light"
                scaleTo={0.95}
                disabled={!trainer}
              >
                <View>
                  <Avatar
                    initials={trainer?.initials ?? user.trainer.initials}
                    size={88}
                    tone="lime"
                    ring
                    imageUri={trainer?.avatarUri}
                  />
                  {trainer ? (
                    <View
                      style={{
                        position: "absolute",
                        right: -2,
                        bottom: -2,
                        width: 30,
                        height: 30,
                        borderRadius: 15,
                        backgroundColor: colors.lime,
                        alignItems: "center",
                        justifyContent: "center",
                        borderWidth: 3,
                        borderColor: "#0A0B0D"
                      }}
                    >
                      <Camera size={13} color="#0A0B0D" strokeWidth={2.6} />
                    </View>
                  ) : null}
                </View>
              </Pressable>
            )}

            <Text variant="h2" className="text-ink mt-3">
              {user.role === "admin" ? user.admin.name : user.trainer.name}
            </Text>
            <Text variant="caption" className="text-lime mt-1">
              {user.role === "admin" ? "ADMIN" : "TRAINER"}
            </Text>

            {trainer ? (
              <Text variant="caption" className="text-ink-3 mt-1.5">
                Tap photo to {hasPic ? "change or remove" : "add a picture"}
              </Text>
            ) : null}
          </MotiView>

          {trainer ? (
            <Card>
              <Text variant="label" className="text-ink-3 mb-3">
                ACCOUNT
              </Text>
              <Row
                icon={<Phone size={13} color={colors.ink2} strokeWidth={2.4} />}
                label="Mobile"
                value={trainer.mobile}
              />
              <Divider />
              <Row
                icon={<User2 size={13} color={colors.ink2} strokeWidth={2.4} />}
                label="Gender"
                value={trainer.gender}
              />
              <Divider />
              <Row
                icon={
                  <Calendar size={13} color={colors.ink2} strokeWidth={2.4} />
                }
                label="Age"
                value={`${trainer.age} yrs`}
              />
              <Divider />
              <Row
                icon={
                  <ShieldCheck
                    size={13}
                    color={trainer.isActive ? colors.success : colors.danger}
                    strokeWidth={2.4}
                  />
                }
                label="Status"
                value={trainer.isActive ? "Active" : "Deactivated"}
              />
            </Card>
          ) : null}

          {user.role === "admin" && (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{
                type: "spring",
                damping: 18,
                stiffness: 200,
                delay: 80
              }}
              className="mt-4"
            >
              <Card>
                <Text variant="label" className="text-ink-3 mb-3">
                  ADMIN
                </Text>
                <Pressable
                  onPress={() => router.push("/admin/meals")}
                  scaleTo={0.97}
                  haptic="light"
                >
                  <View className="flex-row items-center py-2.5">
                    <View className="w-7 h-7 rounded-full bg-lime/10 items-center justify-center mr-3">
                      <ChefHat size={13} color={colors.lime} strokeWidth={2.2} />
                    </View>
                    <Text variant="bodyMedium" className="text-ink flex-1">
                      Meals Management
                    </Text>
                    <ArrowRight
                      size={13}
                      color={colors.ink3}
                      strokeWidth={2.2}
                    />
                  </View>
                </Pressable>
              </Card>
            </MotiView>
          )}

          <View className="mt-4">
            <Button
              label="Sign out"
              variant="outline"
              size="lg"
              fullWidth
              iconLeft={
                <LogOut size={16} color={colors.ink} strokeWidth={2.2} />
              }
              onPress={confirmSignOut}
            />
          </View>
        </ScrollView>
      </SafeAreaView>

      <Sheet
        visible={picOpen}
        onClose={() => setPicOpen(false)}
        title="Profile picture"
        subtitle={
          hasPic
            ? "Pick a new picture or remove the current one."
            : "Add a picture so admin can recognise you."
        }
      >
        <View style={{ gap: 8 }}>
          {Platform.OS !== "web" ? (
            <ActionRow
              icon={<Camera size={16} color={colors.ink} strokeWidth={2.2} />}
              label="Take photo"
              onPress={takePhoto}
            />
          ) : null}
          <ActionRow
            icon={<User2 size={16} color={colors.ink} strokeWidth={2.2} />}
            label="Choose from library"
            onPress={pickFromLibrary}
          />
          {hasPic ? (
            <ActionRow
              icon={
                <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
              }
              label="Remove picture"
              tone="danger"
              onPress={removePic}
            />
          ) : null}
        </View>
      </Sheet>
    </View>
  );
}

function Row({
  icon,
  label,
  value
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View className="flex-row items-center py-2.5">
      <View className="w-7 h-7 rounded-full bg-white/[0.04] items-center justify-center mr-3">
        {icon}
      </View>
      <Text variant="bodyMedium" className="text-ink-2 flex-1">
        {label}
      </Text>
      <Text variant="bodyMedium" className="text-ink" tabular>
        {value}
      </Text>
    </View>
  );
}

function Divider() {
  return <View className="h-px bg-line my-0.5" />;
}

function ActionRow({
  icon,
  label,
  onPress,
  tone = "neutral"
}: {
  icon: React.ReactNode;
  label: string;
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
      <Text
        variant="bodyMedium"
        className={tone === "danger" ? "text-danger" : "text-ink"}
        style={{ fontFamily: "Inter_600SemiBold" }}
      >
        {label}
      </Text>
    </Pressable>
  );
}
