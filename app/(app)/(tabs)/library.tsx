import React, { useMemo, useRef, useState } from "react";
import { View, ScrollView, StatusBar, Alert } from "react-native";
import { router } from "expo-router";
import { MotiView } from "moti";
import {
  BookMarked,
  Star,
  Trash2,
  ChevronRight,
  Plus,
  Search
} from "lucide-react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Text } from "@/components/Text";
import { Card } from "@/components/Card";
import { Pressable } from "@/components/Pressable";
import { Sheet } from "@/components/Sheet";
import { Button } from "@/components/Button";
import { Avatar } from "@/components/Avatar";
import { Input } from "@/components/Input";
import { useLibrary } from "@/store/library";
import { useData, selectAllActiveClients } from "@/store/data";
import { useAuth } from "@/store/auth";
import { useNotifications } from "@/store/notifications";
import { friendlyError } from "@/lib/errors";
import { seedMeals } from "@/data/meals";
import { MealPlanTemplate } from "@/data/types";
import { timeAgo, genderLabel } from "@/lib/format";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

export default function Library() {
  const insets = useSafeAreaInsets();
  const user = useAuth((s) => s.user);
  const templates = useLibrary((s) => s.templates);
  const removeTemplate = useLibrary((s) => s.removeTemplate);
  const saveTemplate = useLibrary((s) => s.saveTemplate);

  const plans = useData((s) => s.plans);
  const clients = useData((s) => s.clients);
  const addPlan = useData((s) => s.addPlan);
  const pushNotification = useNotifications((s) => s.safePush);

  const [savePickerOpen, setSavePickerOpen] = useState(false);
  const [assignFor, setAssignFor] = useState<MealPlanTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<MealPlanTemplate | null>(null);

  // High-rated plans that aren't yet templates — candidates for save
  const candidates = useMemo(() => {
    const tplSourceIds = new Set(templates.map((t) => t.sourcePlanId));
    return plans
      .filter(
        (p) =>
          p.avgRating >= 8 &&
          p.selectedMealIds &&
          p.selectedMealIds.length > 0 &&
          !tplSourceIds.has(p.id)
      )
      .sort((a, b) => b.avgRating - a.avgRating);
  }, [plans, templates]);

  const onRemoveTemplate = (t: MealPlanTemplate) => {
    Alert.alert("Remove template?", `Delete "${t.name}" from the library?`, [
      { text: "Cancel", style: "cancel" },
      {
        text: "Remove",
        style: "destructive",
        onPress: async () => {
          try {
            await removeTemplate(t.id);
            haptics.success();
          } catch (e: any) {
            haptics.warning();
            Alert.alert("Couldn't remove", friendlyError(e));
          }
        }
      }
    ]);
  };

  // Prevents a double-tap from creating two plans + two notifications.
  const assigningRef = useRef(false);

  const onAssignTemplate = async (
    template: MealPlanTemplate,
    clientId: string
  ) => {
    if (assigningRef.current) return;
    const client = clients.find((c) => c.id === clientId);
    if (!client) return;
    assigningRef.current = true;
    try {
      const clientPlans = plans.filter((p) => p.clientId === clientId);
      const nextWeek =
        clientPlans.length === 0
          ? 1
          : Math.max(...clientPlans.map((p) => p.weekNumber)) + 1;
      const created = await addPlan({
        clientId,
        weekNumber: nextWeek,
        calorieRangeLow: template.calorieRangeLow,
        calorieRangeHigh: template.calorieRangeHigh,
        status: "active",
        avgRating: 0,
        createdAt: new Date().toISOString(),
        selectedMealIds: template.selectedMealIds
      });
      haptics.success();
      if (client.trainerId) {
        await pushNotification({
          recipientRole: "trainer",
          recipientId: client.trainerId,
          kind: "admin_changed_plan",
          title: "Admin assigned a plan",
          body: `Admin assigned "${template.name}" to ${client.name}.`,
          payload: {
            clientId,
            planId: created.id,
            trainerId: client.trainerId
          }
        });
      }
      setAssignFor(null);
      Alert.alert(
        "Plan assigned",
        `Plan ${nextWeek} created for ${client.name}. The trainer has been notified.`
      );
    } catch (e: any) {
      haptics.warning();
      Alert.alert("Couldn't assign", friendlyError(e));
    } finally {
      assigningRef.current = false;
    }
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
          <View className="mt-2 mb-5">
            <Text variant="caption" className="text-ink-3">
              ADMIN
            </Text>
            <Text variant="h1" className="text-ink">
              Meal Plan Library
            </Text>
            <Text variant="caption" className="text-ink-2 mt-1">
              {templates.length} saved templates · save high-rated plans &
              reassign
            </Text>
          </View>

          <Pressable
            onPress={() => setSavePickerOpen(true)}
            haptic="light"
            className="flex-row items-center rounded-2xl border border-lime/30 bg-lime/[0.05] p-3.5 mb-4"
          >
            <View className="w-9 h-9 rounded-xl bg-lime/20 items-center justify-center mr-3">
              <Plus size={16} color={colors.lime} strokeWidth={2.4} />
            </View>
            <View className="flex-1">
              <Text
                variant="bodyMedium"
                className="text-ink"
                style={{ fontFamily: "Inter_600SemiBold" }}
              >
                Save a rated plan
              </Text>
              <Text variant="caption" className="text-ink-2 mt-0.5">
                {candidates.length} high-rated plan
                {candidates.length === 1 ? "" : "s"} available
              </Text>
            </View>
            <ChevronRight size={16} color={colors.ink3} strokeWidth={2.2} />
          </Pressable>

          {templates.length === 0 ? (
            <Card>
              <MotiView
                from={{ scale: 0.7, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", damping: 14, stiffness: 200 }}
                className="self-center mb-3"
              >
                <View className="w-14 h-14 rounded-2xl bg-lime/15 border border-lime/30 items-center justify-center">
                  <BookMarked
                    size={22}
                    color={colors.lime}
                    strokeWidth={2.2}
                  />
                </View>
              </MotiView>
              <Text variant="h3" className="text-ink text-center mb-1">
                No templates yet
              </Text>
              <Text variant="body" className="text-ink-2 text-center">
                Save high-rated plans here to reassign them to similar clients.
              </Text>
            </Card>
          ) : (
            <View style={{ gap: 8 }}>
              {templates.map((t, i) => (
                <MotiView
                  key={t.id}
                  from={{ opacity: 0, translateY: 8 }}
                  animate={{ opacity: 1, translateY: 0 }}
                  transition={{
                    type: "spring",
                    damping: 18,
                    stiffness: 200,
                    delay: 40 + i * 35
                  }}
                >
                  <Pressable
                    onPress={() => setPreviewTemplate(t)}
                    haptic="light"
                    scaleTo={0.99}
                    className="rounded-2xl border border-line bg-surface p-3.5"
                  >
                    <View className="flex-row items-start">
                      <View className="flex-1 mr-2">
                        <Text
                          variant="bodyMedium"
                          className="text-ink"
                          numberOfLines={1}
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {t.name}
                        </Text>
                        <Text
                          variant="caption"
                          className="text-ink-3 mt-0.5"
                          numberOfLines={1}
                        >
                          From {t.sourceClientName} · saved{" "}
                          {timeAgo(t.createdAt)}
                        </Text>
                        {t.tagSummary ? (
                          <Text
                            variant="caption"
                            className="text-ink-2 mt-1.5"
                            numberOfLines={1}
                          >
                            {t.tagSummary}
                          </Text>
                        ) : null}
                      </View>
                      <Pressable
                        onPress={() => onRemoveTemplate(t)}
                        haptic="medium"
                        scaleTo={0.92}
                        className="w-8 h-8 rounded-full items-center justify-center"
                      >
                        <Trash2
                          size={14}
                          color={colors.danger}
                          strokeWidth={2.2}
                        />
                      </Pressable>
                    </View>
                    <View
                      className="flex-row mt-3 pt-3 border-t border-line items-center"
                      style={{ gap: 8 }}
                    >
                      <Text
                        variant="caption"
                        className="text-ink-2 flex-1"
                        tabular
                      >
                        {t.calorieRangeLow}–{t.calorieRangeHigh} kcal ·{" "}
                        {t.selectedMealIds.length} meals · tap to view
                      </Text>
                      <Button
                        label="Assign"
                        variant="primary"
                        size="sm"
                        onPress={() => setAssignFor(t)}
                      />
                    </View>
                  </Pressable>
                </MotiView>
              ))}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>

      {/* === SAVE PICKER === */}
      <Sheet
        visible={savePickerOpen}
        onClose={() => setSavePickerOpen(false)}
        title="Save a rated plan"
        subtitle="Pick from plans that scored 8.0 or higher."
        compact={false}
      >
        {candidates.length === 0 ? (
          <View className="rounded-2xl border border-line bg-surface p-5 items-center">
            <Star size={20} color={colors.ink3} strokeWidth={2} />
            <Text variant="body" className="text-ink-2 mt-2 text-center">
              No new high-rated plans to save right now.
            </Text>
          </View>
        ) : (
          <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
            <View style={{ gap: 8 }}>
              {candidates.map((p) => {
                const c = clients.find((cl) => cl.id === p.clientId);
                return (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      setSavePickerOpen(false);
                      router.push(`/(app)/plan-detail?planId=${p.id}`);
                    }}
                    haptic="light"
                    scaleTo={0.98}
                    className="rounded-2xl border border-line bg-surface p-3.5"
                  >
                    <View className="flex-row items-center">
                      <View className="flex-1">
                        <Text
                          variant="bodyMedium"
                          className="text-ink"
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          Plan {p.weekNumber} · {c?.name ?? "—"}
                        </Text>
                        <Text
                          variant="caption"
                          className="text-ink-2 mt-0.5"
                          tabular
                        >
                          {p.calorieRangeLow}–{p.calorieRangeHigh} kcal ·{" "}
                          {p.selectedMealIds?.length ?? 0} meals ·{" "}
                          {timeAgo(p.createdAt)}
                        </Text>
                        <Text
                          variant="caption"
                          className="text-ink-3 mt-1"
                          style={{ fontSize: 10 }}
                        >
                          Tap to preview meals · Save from the plan screen
                        </Text>
                      </View>
                      <View className="flex-row items-center ml-2">
                        <Star
                          size={11}
                          color={colors.lime}
                          fill={colors.lime}
                          strokeWidth={2}
                        />
                        <Text
                          variant="caption"
                          className="text-lime ml-1"
                          tabular
                          style={{ fontFamily: "Inter_600SemiBold" }}
                        >
                          {p.avgRating.toFixed(1)}
                        </Text>
                      </View>
                    </View>
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        )}
      </Sheet>

      {/* === TEMPLATE PREVIEW === */}
      <Sheet
        visible={previewTemplate !== null}
        onClose={() => setPreviewTemplate(null)}
        title={previewTemplate?.name ?? "Template"}
        subtitle={
          previewTemplate
            ? `${previewTemplate.calorieRangeLow}–${previewTemplate.calorieRangeHigh} kcal · ${previewTemplate.selectedMealIds.length} meals`
            : undefined
        }
        compact={false}
      >
        {previewTemplate ? (
          <TemplatePreview
            template={previewTemplate}
            onAssign={() => {
              const t = previewTemplate;
              setPreviewTemplate(null);
              setAssignFor(t);
            }}
          />
        ) : null}
      </Sheet>

      {/* === ASSIGN PICKER === */}
      <Sheet
        visible={assignFor !== null}
        onClose={() => setAssignFor(null)}
        title="Assign to client"
        subtitle={
          assignFor
            ? `${assignFor.name} · ${assignFor.calorieRangeLow}–${assignFor.calorieRangeHigh} kcal`
            : undefined
        }
        compact={false}
      >
        {assignFor ? <AssignList template={assignFor} onAssign={onAssignTemplate} /> : null}
      </Sheet>
    </View>
  );
}

function TemplatePreview({
  template,
  onAssign
}: {
  template: MealPlanTemplate;
  onAssign: () => void;
}) {
  const SLOT_ORDER = ["Breakfast", "Lunch / Dinner"] as const;
  const meals = template.selectedMealIds
    .map((id) => seedMeals.find((m) => m.id === Number(id)))
    .filter((m): m is NonNullable<typeof m> => Boolean(m));

  const bySlot = SLOT_ORDER.map((slot) => ({
    slot,
    meals: meals.filter((m) => m.mealType === slot)
  }));

  return (
    <View>
      <ScrollView
        style={{ maxHeight: 460 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 12, paddingBottom: 12 }}>
          {bySlot.map((s) => (
            <View key={s.slot}>
              <Text variant="label" className="text-ink-3 mb-2">
                {s.slot.toUpperCase()}
              </Text>
              <View style={{ gap: 6 }}>
                {s.meals.length === 0 ? (
                  <Text variant="caption" className="text-ink-4">
                    No meal in this slot.
                  </Text>
                ) : (
                  s.meals.map((m) => (
                    <View
                      key={m.id}
                      className="flex-row items-center rounded-xl border border-line bg-surface px-3 py-2"
                    >
                      <View className="flex-1 mr-2">
                        <Text
                          variant="bodyMedium"
                          className="text-ink"
                          numberOfLines={1}
                          style={{ fontFamily: "Inter_500Medium" }}
                        >
                          {m.mealName}
                        </Text>
                        <Text
                          variant="caption"
                          className="text-ink-3 mt-0.5"
                          tabular
                        >
                          P{Math.round(m.proteinG)} C{Math.round(m.carbsG)} F{Math.round(m.fatG)}
                        </Text>
                      </View>
                      <Text
                        tabular
                        style={{
                          color: "#D8FF5C",
                          fontFamily: "Inter_700Bold",
                          fontSize: 15
                        }}
                      >
                        {m.calories}
                      </Text>
                    </View>
                  ))
                )}
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
      <View className="mt-3">
        <Button
          label="Assign to client"
          size="lg"
          fullWidth
          onPress={onAssign}
        />
      </View>
    </View>
  );
}

function AssignList({
  template,
  onAssign
}: {
  template: MealPlanTemplate;
  onAssign: (t: MealPlanTemplate, clientId: string) => void;
}) {
  const clients = selectAllActiveClients();
  const [search, setSearch] = useState("");
  const filtered = clients.filter((c) =>
    c.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  return (
    <View>
      <Input
        placeholder="Search clients…"
        value={search}
        onChangeText={setSearch}
        iconLeft={<Search size={16} color={colors.ink3} strokeWidth={2.2} />}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <ScrollView
        style={{ maxHeight: 360, marginTop: 10 }}
        showsVerticalScrollIndicator={false}
      >
        <View style={{ gap: 8 }}>
          {filtered.length === 0 ? (
            <Text variant="body" className="text-ink-3 text-center mt-3">
              No matches.
            </Text>
          ) : (
            filtered.map((c) => (
              <Pressable
                key={c.id}
                onPress={() => onAssign(template, c.id)}
                haptic="light"
                scaleTo={0.98}
                className="flex-row items-center rounded-2xl border border-line bg-surface p-3"
              >
                <Avatar initials={c.initials} size={36} />
                <View className="flex-1 ml-3">
                  <Text
                    variant="bodyMedium"
                    className="text-ink"
                    style={{ fontFamily: "Inter_600SemiBold" }}
                  >
                    {c.name}
                  </Text>
                  <Text
                    variant="caption"
                    className="text-ink-3 mt-0.5"
                    tabular
                  >
                    {c.age}y · {genderLabel(c.gender)} · {c.goal} · {c.status}
                  </Text>
                </View>
                <ChevronRight size={16} color={colors.ink3} strokeWidth={2.2} />
              </Pressable>
            ))
          )}
        </View>
      </ScrollView>
    </View>
  );
}
