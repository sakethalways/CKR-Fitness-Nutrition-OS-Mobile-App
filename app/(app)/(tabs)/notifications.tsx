import React, { useMemo } from "react";
import { View, ScrollView, StatusBar, Alert } from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import {
  CheckCircle2,
  AlertTriangle,
  UserPlus,
  Star,
  Trash2,
  RefreshCw,
  Inbox,
  ChevronRight,
  X
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Pressable } from "@/components/Pressable";
import { Button } from "@/components/Button";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import { useData, selectClient, selectTrainer } from "@/store/data";
import { Notification, NotificationKind } from "@/data/types";
import { timeAgo } from "@/lib/format";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";
import { routeForNotification } from "@/lib/notificationRouting";

const iconForKind: Record<NotificationKind, any> = {
  new_client: UserPlus,
  new_rating: Star,
  client_critical: AlertTriangle,
  deletion_request: Trash2,
  plan_change_request: RefreshCw,
  admin_changed_plan: RefreshCw,
  deletion_approved: CheckCircle2
};

const colorForKind: Record<NotificationKind, string> = {
  new_client: colors.info,
  new_rating: colors.lime,
  client_critical: colors.danger,
  deletion_request: colors.danger,
  plan_change_request: colors.warn,
  admin_changed_plan: colors.info,
  deletion_approved: colors.success
};

export default function Notifications() {
  const user = useAuth((s) => s.user)!;
  const insets = useSafeAreaInsets();
  const items = useNotifications((s) => s.items);
  const markRead = useNotifications((s) => s.markRead);
  const markAllRead = useNotifications((s) => s.markAllRead);
  const remove = useNotifications((s) => s.remove);
  const clearForUser = useNotifications((s) => s.clearForUser);
  const pushNotification = useNotifications((s) => s.safePush);
  const updateNotification = useNotifications((s) => s.safeUpdate);
  const removeClient = useData((s) => s.removeClient);
  useData((s) => s.clients);

  const userId = user.role === "admin" ? user.admin.id : user.trainer.id;
  const isAdmin = user.role === "admin";

  const inbox = useMemo(
    () =>
      items
        .filter(
          (n) => n.recipientRole === user.role && n.recipientId === userId
        )
        .sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        ),
    [items, user.role, userId]
  );

  const unread = inbox.filter((n) => !n.isRead).length;

  // ===== Actions =====
  const approveDeletion = (n: Notification) => {
    if (!n.payload.clientId) return;
    const client = selectClient(n.payload.clientId);
    if (!client) {
      Alert.alert("Client not found", "May have already been removed.");
      return;
    }
    Alert.alert(
      "Approve deletion?",
      `Permanently delete ${client.name}? This cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const deletedName = client.name;
            try {
              await removeClient(client.id);
              await updateNotification(n.id, {
                kind: "deletion_approved",
                title: "Deletion completed",
                body: `${deletedName} has been deleted.`,
                isRead: true
              });
              haptics.success();
              if (n.payload.trainerId) {
                await pushNotification({
                  recipientRole: "trainer",
                  recipientId: n.payload.trainerId,
                  kind: "deletion_approved",
                  title: "Deletion approved",
                  body: `Admin deleted ${deletedName}.`,
                  payload: { trainerId: n.payload.trainerId }
                });
              }
              Alert.alert(
                "Client deleted",
                `${deletedName} has been removed. The trainer has been notified.`
              );
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't delete", e?.message ?? String(e));
            }
          }
        }
      ]
    );
  };

  const openTarget = (n: Notification) => {
    if (!n.isRead) markRead(n.id);
    const route = routeForNotification(n);
    if (route) router.push(route as any);
  };

  const openClient = (n: Notification) => {
    if (!n.payload.clientId) return;
    if (!n.isRead) markRead(n.id);
    router.push(`/(app)/client/${n.payload.clientId}`);
  };

  const openPlan = (n: Notification) => {
    if (!n.payload.planId) {
      openClient(n);
      return;
    }
    if (!n.isRead) markRead(n.id);
    router.push(`/(app)/plan-detail?planId=${n.payload.planId}`);
  };

  const deleteOne = (n: Notification) => {
    remove(n.id);
    haptics.tap();
  };

  const clearAll = () => {
    if (inbox.length === 0) return;
    Alert.alert(
      "Clear all notifications?",
      `Removes all ${inbox.length} notifications from your inbox. Cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Clear all",
          style: "destructive",
          onPress: () => {
            clearForUser(user.role, userId);
            haptics.success();
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
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 110,
            paddingTop: 4
          }}
        >
          <View className="flex-row items-end justify-between mt-2 mb-6">
            <View className="flex-1">
              <Text variant="caption" className="text-ink-3">
                INBOX
              </Text>
              <Text variant="h1" className="text-ink">
                Notifications
              </Text>
              {unread > 0 ? (
                <Text variant="caption" className="text-lime mt-1">
                  {unread} unread
                </Text>
              ) : null}
            </View>
            {inbox.length > 0 ? (
              <View className="flex-row" style={{ gap: 6 }}>
                {unread > 0 ? (
                  <Pressable
                    onPress={() => markAllRead(user.role, userId)}
                    haptic="light"
                    className="px-3 h-9 rounded-full border border-line items-center justify-center bg-white/[0.03]"
                  >
                    <Text
                      variant="caption"
                      className="text-ink-2"
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      Mark read
                    </Text>
                  </Pressable>
                ) : null}
                <Pressable
                  onPress={clearAll}
                  haptic="medium"
                  className="px-3 h-9 rounded-full border border-danger/30 items-center justify-center bg-danger/[0.06]"
                >
                  <Text
                    variant="caption"
                    className="text-danger"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    Clear all
                  </Text>
                </Pressable>
              </View>
            ) : null}
          </View>

          {inbox.length === 0 ? (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 280 }}
              className="items-center pt-16"
            >
              <View className="w-14 h-14 rounded-2xl bg-white/[0.04] items-center justify-center mb-3">
                <Inbox size={24} color={colors.ink3} strokeWidth={2} />
              </View>
              <Text variant="h3" className="text-ink mb-1">
                You're all caught up
              </Text>
              <Text variant="body" className="text-ink-2 text-center">
                Updates from {isAdmin ? "trainers" : "admin"} land here.
              </Text>
            </MotiView>
          ) : (
            <View style={{ gap: 8 }}>
              {inbox.map((n, i) => (
                <NotificationCard
                  key={n.id}
                  notification={n}
                  index={i}
                  isAdmin={isAdmin}
                  onPress={() => openTarget(n)}
                  onDelete={() => deleteOne(n)}
                  onApproveDeletion={() => approveDeletion(n)}
                  onOpenClient={() => openClient(n)}
                  onOpenPlan={() => openPlan(n)}
                />
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

function NotificationCard({
  notification,
  index,
  isAdmin,
  onPress,
  onDelete,
  onApproveDeletion,
  onOpenClient,
  onOpenPlan
}: {
  notification: Notification;
  index: number;
  isAdmin: boolean;
  onPress: () => void;
  onDelete: () => void;
  onApproveDeletion: () => void;
  onOpenClient: () => void;
  onOpenPlan: () => void;
}) {
  const Icon = iconForKind[notification.kind];
  const tint = colorForKind[notification.kind];

  const showActions =
    isAdmin &&
    (notification.kind === "deletion_request" ||
      notification.kind === "plan_change_request" ||
      notification.kind === "client_critical");

  const trainerName = notification.payload.trainerId
    ? selectTrainer(notification.payload.trainerId)?.name
    : undefined;
  const clientName = notification.payload.clientId
    ? selectClient(notification.payload.clientId)?.name
    : undefined;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: "spring",
        damping: 18,
        stiffness: 200,
        delay: 40 + index * 30
      }}
    >
      <Pressable
        onPress={onPress}
        className={`rounded-2xl border p-3.5 ${
          notification.isRead
            ? "bg-surface border-line"
            : "bg-lime/[0.04] border-lime/25"
        }`}
      >
        <View className="flex-row items-start">
          <View
            style={{
              width: 32,
              height: 32,
              borderRadius: 16,
              backgroundColor: `${tint}1F`,
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            <Icon size={14} color={tint} strokeWidth={2.4} />
          </View>
          <View className="flex-1 ml-3">
            <View className="flex-row items-baseline justify-between">
              <Text
                variant="bodyMedium"
                className="text-ink flex-1 mr-2"
                numberOfLines={1}
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                {notification.title}
              </Text>
              <Text variant="caption" className="text-ink-4">
                {timeAgo(notification.createdAt)}
              </Text>
            </View>
            <Text variant="caption" className="text-ink-2 mt-0.5">
              {notification.body}
            </Text>
            {trainerName || clientName ? (
              <View className="flex-row mt-1.5" style={{ gap: 6 }}>
                {clientName ? (
                  <View className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-line">
                    <Text
                      variant="caption"
                      className="text-ink-3"
                      style={{ fontSize: 10 }}
                    >
                      Client · {clientName}
                    </Text>
                  </View>
                ) : null}
                {trainerName ? (
                  <View className="px-1.5 py-0.5 rounded-md bg-white/[0.04] border border-line">
                    <Text
                      variant="caption"
                      className="text-ink-3"
                      style={{ fontSize: 10 }}
                    >
                      Trainer · {trainerName.split(" ")[0]}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
          </View>
          {/* Per-row delete (×) */}
          <Pressable
            onPress={onDelete}
            haptic="medium"
            scaleTo={0.85}
            className="w-7 h-7 rounded-full items-center justify-center ml-2"
            style={{ backgroundColor: "rgba(255,255,255,0.04)" }}
          >
            <X size={12} color={colors.ink3} strokeWidth={2.4} />
          </Pressable>
        </View>

        {showActions ? (
          <View
            className="flex-row mt-3 pt-3 border-t border-line"
            style={{ gap: 8 }}
          >
            {notification.kind === "deletion_request" ? (
              <>
                <Button
                  label="Approve deletion"
                  variant="danger"
                  size="sm"
                  onPress={onApproveDeletion}
                />
                <Button
                  label="View client"
                  variant="outline"
                  size="sm"
                  onPress={onOpenClient}
                />
              </>
            ) : notification.kind === "plan_change_request" ? (
              <>
                <Button
                  label="Open plan to edit"
                  variant="primary"
                  size="sm"
                  onPress={onOpenPlan}
                  iconRight={
                    <ChevronRight
                      size={14}
                      color="#0A0B0D"
                      strokeWidth={2.4}
                    />
                  }
                />
                <Button
                  label="View client"
                  variant="outline"
                  size="sm"
                  onPress={onOpenClient}
                />
              </>
            ) : (
              <Button
                label="Open client"
                variant="outline"
                size="sm"
                onPress={onOpenClient}
                iconRight={
                  <ChevronRight
                    size={14}
                    color={colors.ink}
                    strokeWidth={2.4}
                  />
                }
              />
            )}
          </View>
        ) : null}
      </Pressable>
    </MotiView>
  );
}
