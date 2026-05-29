import React, { useMemo, useState } from "react";
import { View, ScrollView, StatusBar, Alert, Linking } from "react-native";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { router, useLocalSearchParams } from "expo-router";
import { MotiView } from "moti";
import {
  ArrowLeft,
  Zap,
  Beef,
  Flame,
  AlertTriangle,
  FileText,
  History,
  Pause,
  MoreHorizontal,
  Pencil,
  CheckCircle2,
  Trash2,
  ChevronRight,
  RefreshCw,
  Star,
  CircleDot,
  Eye,
  BookmarkPlus,
  UserCog,
  Download
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Avatar } from "@/components/Avatar";
import { Pressable } from "@/components/Pressable";
import { Chip } from "@/components/Chip";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { StarRating } from "@/components/StarRating";
import { BottomBar } from "@/components/BottomBar";
import { Sheet } from "@/components/Sheet";
import { ReadMore } from "@/components/ReadMore";
import { Stepper } from "@/components/Stepper";
import { useData } from "@/store/data";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import { useLibrary } from "@/store/library";
import { getAdminId } from "@/lib/admin";
import { ClientStatus, Plan } from "@/data/types";
import {
  genderLabel,
  planDayState,
  planDayLabel,
  formatDate
} from "@/lib/format";
import { buildPlanHTML } from "@/lib/exports";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

const tagTone = (t: string) => {
  if (t === "Vegetarian") return "success" as const;
  if (t === "Busy Pro") return "info" as const;
  if (t === "Sweet Craving") return "warn" as const;
  return "neutral" as const;
};

const statusTone = (s: ClientStatus) => {
  switch (s) {
    case "Critical":
      return "danger" as const;
    case "On Hold":
      return "warn" as const;
    case "Completed":
      return "neutral" as const;
    default:
      return "lime" as const;
  }
};

const statusIcon = (s: ClientStatus) => {
  if (s === "Critical")
    return (
      <AlertTriangle size={9} color={colors.danger} strokeWidth={2.6} />
    );
  if (s === "On Hold")
    return <Pause size={9} color={colors.warn} strokeWidth={2.6} />;
  return undefined;
};

export default function ClientProfile() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();

  // Reactive selectors. `find` returns the same object reference until
  // that specific row mutates — safe. Filtering/sorting MUST happen in
  // useMemo so we don't return a fresh array on every render (loop).
  const client = useData((s) =>
    id ? s.clients.find((c) => c.id === id) : undefined
  );
  const plansAll = useData((s) => s.plans);
  const plans = useMemo(
    () =>
      id
        ? plansAll
            .filter((p) => p.clientId === id)
            .sort((a, b) => b.weekNumber - a.weekNumber)
        : [],
    [plansAll, id]
  );
  const assignedTrainer = useData((s) =>
    client ? s.trainers.find((t) => t.id === client.trainerId) : undefined
  );

  const user = useAuth((s) => s.user);
  const isTrainer = user?.role === "trainer";
  const isAdmin = user?.role === "admin";
  const trainerId = isTrainer ? user.trainer.id : null;
  const trainerName = isTrainer ? user.trainer.name : "";

  const updateClient = useData((s) => s.updateClient);
  const removeClient = useData((s) => s.removeClient);
  const pushNotification = useNotifications((s) => s.safePush);
  const saveTemplate = useLibrary((s) => s.saveTemplate);

  // Sheets
  const [statusOpen, setStatusOpen] = useState(false);
  const [targetsOpen, setTargetsOpen] = useState(false);
  const [actionsOpen, setActionsOpen] = useState(false);
  const [planActionsFor, setPlanActionsFor] = useState<Plan | null>(null);

  const [kcalDraft, setKcalDraft] = useState(0);
  const [proteinDraft, setProteinDraft] = useState(0);

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

  const isCompleted = client.status === "Completed";
  const isOnHold = client.status === "On Hold";
  const hasDeletionRequest = Boolean(client.deletionRequestedBy);
  const canEditStatus = isTrainer && !isCompleted;
  const canEditTargets = isTrainer && !isCompleted;

  // ===== Trainer actions =====
  const setStatus = async (next: ClientStatus) => {
    if (next === client.status) {
      setStatusOpen(false);
      return;
    }
    try {
      await updateClient(client.id, { status: next });
      haptics.success();
      setStatusOpen(false);
      if (next === "Critical" && trainerId) {
        const adminId = await getAdminId();
        if (adminId) {
          await pushNotification({
            recipientRole: "admin",
            recipientId: adminId,
            kind: "client_critical",
            title: "Critical tag set",
            body: `${trainerName.split(" ")[0]} flagged ${client.name} as Critical.`,
            payload: { clientId: client.id, trainerId }
          });
        }
      }
    } catch (e: any) {
      haptics.warning();
      Alert.alert("Couldn't update status", e?.message ?? String(e));
    }
  };

  const openEditTargets = () => {
    setKcalDraft(client.calorieTarget ?? 1800);
    setProteinDraft(client.proteinTarget ?? 100);
    setTargetsOpen(true);
  };

  const saveTargets = async () => {
    try {
      await updateClient(client.id, {
        calorieTarget: kcalDraft,
        proteinTarget: proteinDraft
      });
      haptics.success();
      setTargetsOpen(false);
    } catch (e: any) {
      haptics.warning();
      Alert.alert("Couldn't save targets", e?.message ?? String(e));
    }
  };

  const onMarkClosed = () => {
    setActionsOpen(false);
    Alert.alert(
      "Mark course closed?",
      `${client.name} will be moved to the completed archive.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Mark Closed",
          style: "destructive",
          onPress: async () => {
            try {
              await updateClient(client.id, {
                status: "Completed",
                closedAt: new Date().toISOString()
              });
              haptics.success();
              if (trainerId) {
                const adminId = await getAdminId();
                if (adminId) {
                  await pushNotification({
                    recipientRole: "admin",
                    recipientId: adminId,
                    kind: "deletion_approved",
                    title: "Client course closed",
                    body: `${trainerName.split(" ")[0]} closed ${client.name}'s course.`,
                    payload: { clientId: client.id, trainerId }
                  });
                }
              }
              router.back();
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't close client", e?.message ?? String(e));
            }
          }
        }
      ]
    );
  };

  const onRequestDeletion = () => {
    setActionsOpen(false);
    if (hasDeletionRequest) {
      Alert.alert(
        "Already requested",
        "A deletion request is already pending with admin."
      );
      return;
    }
    Alert.alert(
      "Request deletion?",
      `Admin will be notified. Only admin can permanently delete ${client.name}.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Send request",
          style: "destructive",
          onPress: async () => {
            try {
              await updateClient(client.id, {
                deletionRequestedBy: trainerId ?? "",
                deletionRequestedAt: new Date().toISOString()
              });
              haptics.success();
              if (trainerId) {
                const adminId = await getAdminId();
                if (adminId) {
                  await pushNotification({
                    recipientRole: "admin",
                    recipientId: adminId,
                    kind: "deletion_request",
                    title: "Deletion request",
                    body: `${trainerName.split(" ")[0]} requested deletion of ${client.name}.`,
                    payload: { clientId: client.id, trainerId }
                  });
                }
              }
              Alert.alert(
                "Request sent",
                `Admin has been notified. ${client.name} stays on your list until admin approves.`
              );
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't send request", e?.message ?? String(e));
            }
          }
        }
      ]
    );
  };

  const onRequestPlanChange = async (plan: Plan) => {
    setPlanActionsFor(null);
    try {
      if (trainerId) {
        const adminId = await getAdminId();
        if (adminId) {
          await pushNotification({
            recipientRole: "admin",
            recipientId: adminId,
            kind: "plan_change_request",
            title: "Plan change requested",
            body: `${trainerName.split(" ")[0]} requested changes to Plan ${plan.weekNumber} for ${client.name}.`,
            payload: {
              clientId: client.id,
              planId: plan.id,
              trainerId
            }
          });
        }
      }
      haptics.success();
      Alert.alert(
        "Request sent",
        "Admin will review and respond. You'll get a notification when the plan is updated."
      );
    } catch (e: any) {
      haptics.warning();
      Alert.alert("Couldn't send request", e?.message ?? String(e));
    }
  };

  // ===== Admin actions =====
  const onAdminDeleteClient = () => {
    setActionsOpen(false);
    Alert.alert(
      "Delete client?",
      `Permanently delete ${client.name}? This removes all their plans and ratings. Cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const ownerTrainerId = client.trainerId;
            const deletedName = client.name;
            try {
              await removeClient(client.id);
              haptics.success();
              if (ownerTrainerId) {
                await pushNotification({
                  recipientRole: "trainer",
                  recipientId: ownerTrainerId,
                  kind: "deletion_approved",
                  title: "Client deleted by admin",
                  body: `Admin removed ${deletedName} from your roster.`,
                  payload: { trainerId: ownerTrainerId }
                });
              }
              Alert.alert(
                "Client deleted",
                `${deletedName} has been permanently removed. The assigned trainer has been notified.`,
                [{ text: "OK", onPress: () => router.back() }]
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

  const onAdminSavePlanToLibrary = async (plan: Plan) => {
    setPlanActionsFor(null);
    if (!plan.selectedMealIds || plan.selectedMealIds.length === 0) {
      Alert.alert(
        "Can't save",
        "This plan has no meal selections (it's from an earlier seed)."
      );
      return;
    }
    if (!isAdmin || !user || user.role !== "admin") return;
    try {
      await saveTemplate({
        name: `${client.goal} · ${plan.calorieRangeLow}–${plan.calorieRangeHigh} kcal`,
        sourcePlanId: plan.id,
        sourceClientName: client.name,
        savedByAdminId: user.admin.id,
        selectedMealIds: plan.selectedMealIds,
        calorieRangeLow: plan.calorieRangeLow,
        calorieRangeHigh: plan.calorieRangeHigh,
        tagSummary: `${client.goal} · ${client.foodPref} · ${client.clientTypes.join(" / ")}`
      });
      haptics.success();
      Alert.alert("Saved to library", "Template available in the Library tab.");
    } catch (e: any) {
      haptics.warning();
      Alert.alert("Couldn't save", e?.message ?? String(e));
    }
  };

  const onDownloadPDF = async (plan: Plan) => {
    setPlanActionsFor(null);
    if (!plan.selectedMealIds || plan.selectedMealIds.length === 0) {
      Alert.alert("No meals", "This plan has no meal data to export.");
      return;
    }
    try {
      const meals = plan.selectedMealIds
        .map((id) => seedMeals.find((m) => m.id === Number(id)))
        .filter((m): m is NonNullable<typeof m> => Boolean(m));

      const sections = [
        { slot: "Breakfast", meals: meals.filter((m) => m.mealType === "Breakfast") },
        { slot: "Lunch / Dinner", meals: meals.filter((m) => m.mealType === "Lunch / Dinner") }
      ].filter((s) => s.meals.length > 0);

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
    }
  };

  const onDeletePlan = (plan: Plan) => {
    setPlanActionsFor(null);
    Alert.alert(
      "Delete this plan?",
      `Week ${plan.weekNumber} for ${client.name}. This action cannot be undone.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              await useData.getState().deletePlan(plan.id);
              haptics.success();
              Alert.alert("Deleted", "Plan has been removed.");
            } catch (e: any) {
              haptics.warning();
              Alert.alert("Couldn't delete", e?.message ?? String(e));
            }
          }
        }
      ]
    );
  };

  const showActionsButton = (isTrainer && !isCompleted) || isAdmin;

  return (
    <View className="flex-1 bg-bg">
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={["#0F1308", "#0A0B0D", "#0A0B0D"]}
        locations={[0, 0.45, 1]}
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
            CLIENT
          </Text>
          {showActionsButton ? (
            <Pressable
              onPress={() => setActionsOpen(true)}
              className="w-11 h-11 rounded-full border border-line items-center justify-center bg-white/[0.03]"
            >
              <MoreHorizontal size={18} color={colors.ink} strokeWidth={2.2} />
            </Pressable>
          ) : (
            <View className="w-11 h-11" />
          )}
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + (isCompleted || isAdmin ? 32 : 120)
          }}
        >
          {/* Identity */}
          <MotiView
            from={{ opacity: 0, translateY: 10, scale: 0.98 }}
            animate={{ opacity: 1, translateY: 0, scale: 1 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="items-center mb-4 mt-1"
          >
            <Avatar initials={client.initials} size={60} tone="lime" ring />
            <Text variant="h2" className="text-ink mt-3">
              {client.name}
            </Text>
            <Text variant="caption" className="text-ink-2 mt-0.5" tabular>
              {client.age} yrs · {genderLabel(client.gender)} · {client.weight}kg · {client.height}cm
            </Text>

            {/* Trainer name — visible to admin for cross-team visibility */}
            {isAdmin && assignedTrainer ? (
              <View className="flex-row items-center mt-2">
                <UserCog
                  size={11}
                  color={colors.ink3}
                  strokeWidth={2.4}
                />
                <Text variant="caption" className="text-ink-3 ml-1">
                  Coached by{" "}
                  <Text
                    variant="caption"
                    className="text-ink"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {assignedTrainer.name}
                  </Text>
                </Text>
              </View>
            ) : null}

            {/* Status + goal + types chips (status renders directly when not tappable) */}
            <View
              className="flex-row flex-wrap justify-center mt-3"
              style={{ gap: 5 }}
            >
              {canEditStatus ? (
                <Pressable
                  onPress={() => setStatusOpen(true)}
                  haptic="light"
                  scaleTo={0.95}
                >
                  <Chip
                    label={client.status}
                    tone={statusTone(client.status)}
                    iconLeft={statusIcon(client.status)}
                  />
                </Pressable>
              ) : (
                <Chip
                  label={client.status}
                  tone={statusTone(client.status)}
                  iconLeft={statusIcon(client.status)}
                />
              )}
              <Chip label={client.goal} tone="lime" />
              {client.clientTypes.map((t) => (
                <Chip key={t} label={t} tone={tagTone(t)} />
              ))}
            </View>
          </MotiView>

          {/* STATUS section — explicit "Change" affordance for trainer */}
          {isTrainer && !isCompleted ? (
            <Pressable
              onPress={() => setStatusOpen(true)}
              haptic="light"
              scaleTo={0.99}
              className="mb-4"
            >
              <View
                className={`rounded-2xl border p-3.5 flex-row items-center ${
                  client.status === "Critical"
                    ? "border-danger/30 bg-danger/[0.06]"
                    : client.status === "On Hold"
                    ? "border-warn/30 bg-warn/[0.06]"
                    : "border-lime/25 bg-lime/[0.04]"
                }`}
              >
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                  style={{
                    backgroundColor:
                      client.status === "Critical"
                        ? "rgba(248,113,113,0.15)"
                        : client.status === "On Hold"
                        ? "rgba(251,191,36,0.15)"
                        : "rgba(198,244,50,0.15)"
                  }}
                >
                  {client.status === "Critical" ? (
                    <AlertTriangle
                      size={16}
                      color={colors.danger}
                      strokeWidth={2.4}
                    />
                  ) : client.status === "On Hold" ? (
                    <Pause size={16} color={colors.warn} strokeWidth={2.4} />
                  ) : (
                    <CheckCircle2
                      size={16}
                      color={colors.lime}
                      strokeWidth={2.4}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text variant="caption" className="text-ink-3">
                    STATUS
                  </Text>
                  <Text
                    variant="bodyMedium"
                    className={
                      client.status === "Critical"
                        ? "text-danger"
                        : client.status === "On Hold"
                        ? "text-warn"
                        : "text-lime"
                    }
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {client.status}
                  </Text>
                </View>
                <View className="flex-row items-center">
                  <Text
                    variant="caption"
                    className="text-ink-2 mr-1"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    Change
                  </Text>
                  <ChevronRight size={14} color={colors.ink2} strokeWidth={2.4} />
                </View>
              </View>
            </Pressable>
          ) : null}

          {/* Deletion-request banner */}
          {hasDeletionRequest ? (
            <MotiView
              from={{ opacity: 0, translateY: 8 }}
              animate={{ opacity: 1, translateY: 0 }}
              transition={{ type: "timing", duration: 280 }}
              className="mb-4 rounded-2xl border border-warn/30 bg-warn/10 p-3.5 flex-row items-center"
            >
              <CircleDot size={14} color={colors.warn} strokeWidth={2.4} />
              <View className="ml-2 flex-1">
                <Text
                  variant="caption"
                  className="text-warn"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  DELETION REQUESTED
                </Text>
                <Text variant="caption" className="text-ink-2 mt-0.5">
                  {isAdmin
                    ? "Trainer is requesting removal — review in your inbox or delete from ⋯."
                    : "Waiting for admin approval."}
                </Text>
              </View>
            </MotiView>
          ) : null}

          {/* Targets — tappable for trainer, read-only for admin */}
          {client.calorieTarget && client.proteinTarget ? (
            <View className="flex-row mb-4" style={{ gap: 8 }}>
              {canEditTargets ? (
                <Pressable
                  onPress={openEditTargets}
                  scaleTo={0.98}
                  haptic="light"
                  className="flex-1"
                >
                  <TargetCard
                    type="kcal"
                    value={client.calorieTarget}
                    delay={60}
                    editable
                  />
                </Pressable>
              ) : (
                <View className="flex-1">
                  <TargetCard
                    type="kcal"
                    value={client.calorieTarget}
                    delay={60}
                  />
                </View>
              )}
              {canEditTargets ? (
                <Pressable
                  onPress={openEditTargets}
                  scaleTo={0.98}
                  haptic="light"
                  className="flex-1"
                >
                  <TargetCard
                    type="protein"
                    value={client.proteinTarget}
                    delay={120}
                    editable
                  />
                </Pressable>
              ) : (
                <View className="flex-1">
                  <TargetCard
                    type="protein"
                    value={client.proteinTarget}
                    delay={120}
                  />
                </View>
              )}
            </View>
          ) : null}

          {/* Trainer notes with read more */}
          <Card delay={180} className="mb-4">
            <View className="flex-row items-center mb-2">
              <FileText size={12} color={colors.ink3} strokeWidth={2.2} />
              <Text variant="label" className="text-ink-3 ml-1.5">
                TRAINER NOTES
              </Text>
            </View>
            {client.notes ? (
              <ReadMore text={client.notes} />
            ) : (
              <Text variant="body" className="text-ink-3">
                No notes yet.
              </Text>
            )}
            {client.allergens.length > 0 && client.allergens[0] !== "None" ? (
              <View className="flex-row items-center mt-3 pt-3 border-t border-line flex-wrap">
                <AlertTriangle
                  size={11}
                  color={colors.danger}
                  strokeWidth={2.4}
                />
                <Text variant="caption" className="text-danger ml-1.5 mr-2">
                  ALLERGENS
                </Text>
                <View className="flex-row flex-wrap" style={{ gap: 5 }}>
                  {client.allergens.map((a) => (
                    <Chip key={a} label={a} tone="danger" />
                  ))}
                </View>
              </View>
            ) : null}
          </Card>

          {/* Plan history — tappable for both roles */}
          <View className="flex-row items-center mt-2 mb-3">
            <History size={12} color={colors.ink3} strokeWidth={2.2} />
            <Text variant="label" className="text-ink-3 ml-1.5">
              PLAN HISTORY
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            {plans.length === 0 ? (
              <View className="rounded-2xl border border-line bg-surface p-5 items-center">
                <Text variant="body" className="text-ink-2 text-center">
                  No plans yet.
                </Text>
              </View>
            ) : (
              plans.map((plan, i) => (
                <MotiView
                  key={plan.id}
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: "spring",
                    damping: 18,
                    stiffness: 200,
                    delay: 220 + i * 35
                  }}
                >
                  <Pressable
                    onPress={() => setPlanActionsFor(plan)}
                    haptic="light"
                    className="rounded-2xl border border-line bg-surface p-3.5"
                  >
                    <View className="flex-row items-center justify-between">
                      <View className="flex-row items-center">
                        <Text variant="h3" className="text-ink">
                          Plan {plan.weekNumber}
                        </Text>
                        <View className="ml-2">
                          <Chip
                            label={plan.status === "active" ? "Active" : "Past"}
                            tone={plan.status === "active" ? "lime" : "neutral"}
                          />
                        </View>
                      </View>
                      {plan.avgRating > 0 ? (
                        <StarRating value={plan.avgRating} />
                      ) : (
                        <View className="flex-row items-center">
                          <Text variant="caption" className="text-ink-4 mr-1">
                            not rated
                          </Text>
                          <ChevronRight
                            size={14}
                            color={colors.ink3}
                            strokeWidth={2}
                          />
                        </View>
                      )}
                    </View>
                    <View className="flex-row items-center mt-1.5">
                      <Zap size={11} color={colors.ink3} strokeWidth={2.2} />
                      <Text
                        variant="caption"
                        className="text-ink-2 ml-1"
                        tabular
                      >
                        {plan.calorieRangeLow}–{plan.calorieRangeHigh} kcal/d
                      </Text>
                    </View>
                    {/* Day-tracker + created-at line */}
                    {(() => {
                      const ds = planDayState({
                        createdAt: plan.createdAt,
                        planStatus: plan.status,
                        clientStatus: client.status
                      });
                      const tint =
                        ds.kind === "reached"
                          ? colors.success
                          : ds.kind === "extend"
                          ? colors.warn
                          : ds.kind === "ended"
                          ? colors.ink3
                          : colors.lime;
                      return (
                        <View className="flex-row items-center justify-between mt-1.5 pt-1.5 border-t border-line">
                          <Text
                            variant="caption"
                            style={{
                              color: tint,
                              fontFamily: "Inter_600SemiBold"
                            }}
                          >
                            {planDayLabel(ds)}
                          </Text>
                          <Text variant="caption" className="text-ink-4" tabular>
                            Created {formatDate(plan.createdAt)}
                          </Text>
                        </View>
                      );
                    })()}
                  </Pressable>
                </MotiView>
              ))
            )}
          </View>
        </ScrollView>
      </SafeAreaView>

      {/* Bottom CTA — Generate New Plan (trainer only, not for completed) */}
      {isTrainer && !isCompleted ? (
        <BottomBar>
          <Button
            label={isOnHold ? "Resume & Generate Plan" : "Generate New Plan"}
            size="lg"
            fullWidth
            onPress={() =>
              router.push(`/(app)/generate?clientId=${client.id}`)
            }
          />
        </BottomBar>
      ) : null}

      {/* === STATUS SHEET === */}
      <Sheet
        visible={statusOpen}
        onClose={() => setStatusOpen(false)}
        title="Update Status"
        subtitle="You can change this anytime."
      >
        <View style={{ gap: 8 }}>
          {(["Active", "Critical", "On Hold"] as ClientStatus[]).map((s) => {
            const active = client.status === s;
            return (
              <Pressable
                key={s}
                onPress={() => setStatus(s)}
                haptic="light"
                scaleTo={0.98}
                className={`flex-row items-center rounded-2xl border p-3.5 ${
                  active
                    ? "bg-lime/10 border-lime/40"
                    : "bg-surface border-line"
                }`}
              >
                <View
                  className="w-9 h-9 rounded-xl items-center justify-center mr-3"
                  style={{
                    backgroundColor:
                      s === "Critical"
                        ? "rgba(248,113,113,0.15)"
                        : s === "On Hold"
                        ? "rgba(251,191,36,0.15)"
                        : "rgba(198,244,50,0.15)"
                  }}
                >
                  {s === "Critical" ? (
                    <AlertTriangle
                      size={16}
                      color={colors.danger}
                      strokeWidth={2.4}
                    />
                  ) : s === "On Hold" ? (
                    <Pause size={16} color={colors.warn} strokeWidth={2.4} />
                  ) : (
                    <CheckCircle2
                      size={16}
                      color={colors.lime}
                      strokeWidth={2.4}
                    />
                  )}
                </View>
                <View className="flex-1">
                  <Text
                    variant="bodyMedium"
                    className="text-ink"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {s}
                  </Text>
                  <Text variant="caption" className="text-ink-3 mt-0.5">
                    {s === "Critical"
                      ? "Needs attention. Admin gets a notification."
                      : s === "On Hold"
                      ? "Paused — travel, illness, or break."
                      : "Default. Normal coaching cadence."}
                  </Text>
                </View>
                {active ? (
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: colors.lime
                    }}
                  />
                ) : null}
              </Pressable>
            );
          })}
        </View>
      </Sheet>

      {/* === EDIT TARGETS SHEET === */}
      <Sheet
        visible={targetsOpen}
        onClose={() => setTargetsOpen(false)}
        title="Edit Targets"
        subtitle="Tweak the client's daily calorie and protein."
      >
        <View className="flex-row" style={{ gap: 10 }}>
          <Stepper
            label="Calories"
            value={kcalDraft}
            onChange={setKcalDraft}
            min={1000}
            max={5000}
            step={50}
            suffix="kcal"
          />
          <Stepper
            label="Protein"
            value={proteinDraft}
            onChange={setProteinDraft}
            min={40}
            max={300}
            step={5}
            suffix="g"
          />
        </View>
        <View className="mt-5">
          <Button label="Save" size="lg" fullWidth onPress={saveTargets} />
        </View>
      </Sheet>

      {/* === ACTIONS SHEET === */}
      <Sheet
        visible={actionsOpen}
        onClose={() => setActionsOpen(false)}
        title={isAdmin ? "Admin Actions" : "Manage Client"}
      >
        <View style={{ gap: 8 }}>
          {isTrainer ? (
            <>
              <ActionRow
                icon={
                  <Pencil size={16} color={colors.ink} strokeWidth={2.2} />
                }
                label="Edit details"
                onPress={() => {
                  setActionsOpen(false);
                  router.push(`/(app)/edit-client?clientId=${client.id}`);
                }}
              />
              <ActionRow
                icon={
                  <CheckCircle2
                    size={16}
                    color={colors.success}
                    strokeWidth={2.2}
                  />
                }
                label="Mark course closed"
                sub="Move to completed archive"
                onPress={onMarkClosed}
              />
              <ActionRow
                icon={
                  <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
                }
                label={
                  hasDeletionRequest ? "Request pending" : "Request deletion"
                }
                sub={
                  hasDeletionRequest
                    ? "Already sent — waiting for admin"
                    : "Admin approval required"
                }
                tone="danger"
                disabled={hasDeletionRequest}
                onPress={onRequestDeletion}
              />
            </>
          ) : null}
          {isAdmin ? (
            <>
              <ActionRow
                icon={
                  <Pencil size={16} color={colors.ink} strokeWidth={2.2} />
                }
                label="Edit details"
                onPress={() => {
                  setActionsOpen(false);
                  router.push(`/(app)/edit-client?clientId=${client.id}`);
                }}
              />
              <ActionRow
                icon={
                  <Trash2 size={16} color={colors.danger} strokeWidth={2.2} />
                }
                label="Delete client"
                sub="Permanent — removes all plans and ratings"
                tone="danger"
                onPress={onAdminDeleteClient}
              />
            </>
          ) : null}
        </View>
      </Sheet>

      {/* === PLAN-ROW ACTIONS SHEET === */}
      <Sheet
        visible={planActionsFor !== null}
        onClose={() => setPlanActionsFor(null)}
        title={planActionsFor ? `Plan ${planActionsFor.weekNumber}` : ""}
        subtitle={
          planActionsFor
            ? `${planActionsFor.calorieRangeLow}–${planActionsFor.calorieRangeHigh} kcal/d`
            : undefined
        }
      >
        <View style={{ gap: 8 }}>
          <ActionRow
            icon={<Eye size={16} color={colors.ink} strokeWidth={2.2} />}
            label={isAdmin ? "View & edit meals" : "View meals"}
            sub={
              isAdmin
                ? "Open plan · swap meals if needed"
                : "Open the 8-meal plan"
            }
            onPress={() => {
              const p = planActionsFor;
              setPlanActionsFor(null);
              if (p) router.push(`/(app)/plan-detail?planId=${p.id}`);
            }}
          />
          {isTrainer ? (
            <>
              <ActionRow
                icon={<Star size={16} color={colors.lime} strokeWidth={2.2} />}
                label={
                  planActionsFor?.avgRating && planActionsFor.avgRating > 0
                    ? "Update ratings"
                    : "Rate this plan"
                }
                sub="Enter client feedback (1–10 per meal)"
                onPress={() => {
                  if (!planActionsFor) return;
                  const p = planActionsFor;
                  setPlanActionsFor(null);
                  router.push(`/(app)/rate-plan?planId=${p.id}`);
                }}
              />
              <ActionRow
                icon={
                  <RefreshCw
                    size={16}
                    color={colors.info}
                    strokeWidth={2.2}
                  />
                }
                label="Request plan change"
                sub="Ask admin to swap meals or replan"
                onPress={() =>
                  planActionsFor && onRequestPlanChange(planActionsFor)
                }
              />
            </>
          ) : null}
          {isAdmin && planActionsFor && planActionsFor.avgRating >= 8 ? (
            <ActionRow
              icon={
                <BookmarkPlus
                  size={16}
                  color={colors.lime}
                  strokeWidth={2.2}
                />
              }
              label="Save to library"
              sub={`Rated ${planActionsFor.avgRating.toFixed(1)}★ — reusable template`}
              onPress={() =>
                planActionsFor && onAdminSavePlanToLibrary(planActionsFor)
              }
            />
          ) : null}
          <ActionRow
            icon={
              <Download
                size={16}
                color={colors.info}
                strokeWidth={2.2}
              />
            }
            label="Download as PDF"
            sub="Share plan with client"
            onPress={() =>
              planActionsFor && onDownloadPDF(planActionsFor)
            }
          />
          <ActionRow
            icon={
              <Trash2
                size={16}
                color="#F87171"
                strokeWidth={2.2}
              />
            }
            label="Delete plan"
            sub="Remove this plan permanently"
            onPress={() =>
              planActionsFor && onDeletePlan(planActionsFor)
            }
          />
        </View>
      </Sheet>
    </View>
  );
}

function TargetCard({
  type,
  value,
  delay,
  editable
}: {
  type: "kcal" | "protein";
  value: number;
  delay: number;
  editable?: boolean;
}) {
  const isKcal = type === "kcal";
  return (
    <Card delay={delay} padded={false}>
      <View className="p-3.5">
        <View className="flex-row items-center mb-1">
          {isKcal ? (
            <Flame size={11} color={colors.lime} strokeWidth={2.4} />
          ) : (
            <Beef size={11} color={colors.info} strokeWidth={2.4} />
          )}
          <Text
            variant="caption"
            className={isKcal ? "text-lime ml-1 flex-1" : "text-info ml-1 flex-1"}
          >
            {isKcal ? "CALORIE TARGET" : "PROTEIN TARGET"}
          </Text>
          {editable ? (
            <Pencil size={11} color={colors.ink3} strokeWidth={2.2} />
          ) : null}
        </View>
        <View className="flex-row items-baseline">
          <Text
            tabular
            style={{
              fontFamily: "Inter_700Bold",
              fontSize: 22,
              color: "#FFFFFF",
              letterSpacing: -0.4
            }}
          >
            {value}
          </Text>
          <Text variant="caption" className="text-ink-3 ml-1">
            {isKcal ? "kcal/d" : "g/d"}
          </Text>
        </View>
      </View>
    </Card>
  );
}

function ActionRow({
  icon,
  label,
  sub,
  onPress,
  tone = "neutral",
  disabled
}: {
  icon: React.ReactNode;
  label: string;
  sub?: string;
  onPress: () => void;
  tone?: "neutral" | "danger";
  disabled?: boolean;
}) {
  return (
    <Pressable
      onPress={disabled ? undefined : onPress}
      haptic={disabled ? "none" : "light"}
      disabled={disabled}
      scaleTo={0.98}
      className={`flex-row items-center rounded-2xl border p-3.5 ${
        tone === "danger"
          ? "border-danger/25 bg-danger/[0.04]"
          : "border-line bg-surface"
      } ${disabled ? "opacity-50" : ""}`}
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
      {!disabled ? (
        <ChevronRight size={16} color={colors.ink3} strokeWidth={2.2} />
      ) : null}
    </Pressable>
  );
}
