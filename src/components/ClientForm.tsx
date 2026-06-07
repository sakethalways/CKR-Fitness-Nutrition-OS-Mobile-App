import React, { useMemo, useState } from "react";
import {
  View,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  TextInput
} from "react-native";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Phone } from "lucide-react-native";
import { Text } from "@/components/Text";
import { Input } from "@/components/Input";
import { Stepper } from "@/components/Stepper";
import { HeightField } from "@/components/HeightField";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ChipSelector } from "@/components/ChipSelector";
import { RadioGroup } from "@/components/RadioGroup";
import { Textarea } from "@/components/Textarea";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { CountryCodePicker } from "@/components/CountryCodePicker";
import {
  ActivityLevel,
  Allergen,
  ALLERGENS,
  Client,
  ClientStatus,
  ClientType,
  FoodPref,
  Gender,
  Goal
} from "@/data/types";
import { DEFAULT_COUNTRY_CODE } from "@/data/countryCodes";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

const CLIENT_TYPES: readonly ClientType[] = [
  "Vegetarian",
  "Busy Pro",
  "Sweet Craving",
  "Standard"
] as const;

const ACTIVITY_OPTS: { value: ActivityLevel; label: string; hint: string }[] = [
  { value: "Sedentary", label: "Sedentary", hint: "Desk job, little exercise" },
  {
    value: "Lightly Active",
    label: "Lightly Active",
    hint: "1–3 light workouts/week"
  },
  { value: "Moderate", label: "Moderate", hint: "3–5 workouts/week" },
  {
    value: "Very Active",
    label: "Very Active",
    hint: "Daily training or physical job"
  }
];

export type ClientFormData = {
  name: string;
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  goal: Goal;
  activityLevel: ActivityLevel;
  clientTypes: ClientType[];
  foodPref: FoodPref;
  allergens: Allergen[];
  status: ClientStatus;
  phoneCountryCode: string;
  phoneNumber: string;
  notes: string;
};

type Props = {
  initial?: Partial<Client>;
  submitLabel: string;
  onSubmit: (data: ClientFormData) => void;
  headerTitle: string;
  headerSubtitle: string;
};

export function ClientForm({
  initial,
  submitLabel,
  onSubmit,
  headerTitle,
  headerSubtitle
}: Props) {
  const insets = useSafeAreaInsets();

  const [name, setName] = useState(initial?.name ?? "");
  const [goal, setGoal] = useState<Goal>(initial?.goal ?? "Fat Loss");
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "F");
  const [age, setAge] = useState(initial?.age ?? 28);
  const [weight, setWeight] = useState(initial?.weight ?? 62);
  const [height, setHeight] = useState(initial?.height ?? 162);
  const [activity, setActivity] = useState<ActivityLevel>(
    initial?.activityLevel ?? "Lightly Active"
  );
  const [foodPref, setFoodPref] = useState<FoodPref>(
    initial?.foodPref ?? "Veg"
  );
  const [clientTypes, setClientTypes] = useState<ClientType[]>(
    initial?.clientTypes ?? ["Standard"]
  );
  const [allergens, setAllergens] = useState<Allergen[]>(
    initial?.allergens ?? ["None"]
  );
  const [status, setStatus] = useState<ClientStatus>(
    initial?.status === "Completed" ? "Active" : initial?.status ?? "Active"
  );
  const [phoneCountryCode, setPhoneCountryCode] = useState(
    initial?.phoneCountryCode ?? DEFAULT_COUNTRY_CODE
  );
  const [phoneNumber, setPhoneNumber] = useState(initial?.phoneNumber ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [nameError, setNameError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);

  const isValid = useMemo(() => name.trim().length >= 2, [name]);

  const submit = () => {
    if (!isValid) {
      setNameError("Enter a name");
      haptics.warning();
      return;
    }
    // Phone is optional but if provided must be at least 7 digits
    if (phoneNumber && phoneNumber.replace(/\D/g, "").length < 7) {
      setPhoneError("Enter a valid phone number");
      haptics.warning();
      return;
    }
    onSubmit({
      name: name.trim(),
      age,
      gender,
      weight,
      height,
      goal,
      activityLevel: activity,
      clientTypes,
      foodPref,
      allergens: allergens.length === 0 ? ["None"] : allergens,
      status,
      phoneCountryCode,
      phoneNumber: phoneNumber.replace(/\D/g, ""),
      notes: notes.trim()
    });
  };

  return (
    <>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{
            paddingHorizontal: 20,
            paddingBottom: insets.bottom + 120
          }}
        >
          <MotiView
            from={{ opacity: 0, translateY: 10 }}
            animate={{ opacity: 1, translateY: 0 }}
            transition={{ type: "spring", damping: 18, stiffness: 200 }}
            className="mb-5"
          >
            <Text variant="h1" className="text-ink">
              {headerTitle}
            </Text>
            <Text variant="caption" className="text-ink-2 mt-1">
              {headerSubtitle}
            </Text>
          </MotiView>

          <Section title="BASICS" delay={60}>
            <Input
              label="Name"
              placeholder="e.g. Priya Sharma"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (nameError) setNameError(null);
              }}
              autoCapitalize="words"
              error={nameError ?? undefined}
            />

            <View className="mt-3">
              <Text variant="label" className="text-ink-2 mb-2">
                GENDER
              </Text>
              <SegmentedControl<Gender>
                value={gender}
                onChange={setGender}
                options={[
                  { value: "M", label: "Male" },
                  { value: "F", label: "Female" },
                  { value: "Other", label: "Other" }
                ]}
              />
            </View>

            <View className="flex-row mt-3" style={{ gap: 8 }}>
              <Stepper
                label="Age"
                value={age}
                onChange={setAge}
                min={12}
                max={90}
                suffix="yrs"
              />
              <Stepper
                label="Weight"
                value={weight}
                onChange={setWeight}
                min={30}
                max={200}
                suffix="kg"
              />
            </View>

            <View className="mt-3">
              <HeightField value={height} onChange={setHeight} />
            </View>
          </Section>

          {/* PHONE */}
          <Section
            title="WHATSAPP NUMBER"
            hint="Used to send plans · optional"
            delay={100}
          >
            <View className="flex-row" style={{ gap: 8 }}>
              <CountryCodePicker
                value={phoneCountryCode}
                onChange={setPhoneCountryCode}
              />
              <View style={{ flex: 1 }}>
                <PhoneInput
                  value={phoneNumber}
                  onChangeText={(t) => {
                    setPhoneNumber(t.replace(/\D/g, "").slice(0, 14));
                    if (phoneError) setPhoneError(null);
                  }}
                  error={phoneError}
                />
              </View>
            </View>
            {phoneError ? (
              <Text variant="caption" className="text-danger mt-1.5">
                {phoneError}
              </Text>
            ) : null}
          </Section>

          {/* STATUS — visible right up front so trainers see the tag option */}
          <Section
            title="STATUS"
            hint="Change anytime from the profile"
            delay={140}
          >
            <SegmentedControl<ClientStatus>
              value={status}
              onChange={setStatus}
              options={[
                { value: "Active", label: "Active" },
                { value: "Critical", label: "Critical" },
                { value: "On Hold", label: "On Hold" }
              ]}
            />
          </Section>

          <Section title="GOAL" delay={180}>
            <SegmentedControl<Goal>
              value={goal}
              onChange={setGoal}
              options={[
                { value: "Fat Loss", label: "Fat Loss" },
                { value: "Muscle Gain", label: "Muscle" },
                { value: "Maintain", label: "Maintain" },
                { value: "Recomp", label: "Recomp" }
              ]}
            />
          </Section>

          <Section title="ACTIVITY LEVEL" delay={220}>
            <RadioGroup<ActivityLevel>
              value={activity}
              onChange={setActivity}
              options={ACTIVITY_OPTS}
            />
          </Section>

          <Section title="FOOD PREFERENCE" delay={260}>
            <SegmentedControl<FoodPref>
              value={foodPref}
              onChange={setFoodPref}
              options={[
                { value: "Veg", label: "Veg" },
                { value: "Non-Veg", label: "Non-Veg" },
                { value: "Both", label: "Both" }
              ]}
            />
          </Section>

          <Section title="CLIENT TYPE" hint="Tap multiple" delay={300}>
            <ChipSelector<ClientType>
              options={CLIENT_TYPES}
              value={clientTypes}
              onChange={setClientTypes}
            />
          </Section>

          <Section
            title="ALLERGENS"
            hint="Auto-excluded · tap None to clear"
            delay={340}
          >
            <ChipSelector<Allergen>
              options={ALLERGENS}
              value={allergens}
              onChange={setAllergens}
              exclusive="None"
            />
          </Section>

          <Section title="TRAINER NOTES" delay={380}>
            <Textarea
              placeholder="What you've learned about this client so far..."
              value={notes}
              onChangeText={setNotes}
            />
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomBar>
        <Button
          label={submitLabel}
          size="lg"
          fullWidth
          disabled={!isValid}
          onPress={submit}
        />
      </BottomBar>
    </>
  );
}

function PhoneInput({
  value,
  onChangeText,
  error
}: {
  value: string;
  onChangeText: (t: string) => void;
  error?: string | null;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <View
      className="rounded-xl border flex-row items-center px-3 h-12"
      style={{
        borderColor: error
          ? colors.danger
          : focused
          ? colors.lime
          : "rgba(255,255,255,0.14)",
        backgroundColor: focused ? "rgba(198,244,50,0.04)" : colors.surface
      }}
    >
      <Phone size={16} color={colors.ink2} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder="Phone number"
        placeholderTextColor={colors.ink3}
        keyboardType="number-pad"
        autoCapitalize="none"
        selectionColor={colors.lime}
        className="flex-1 text-ink ml-2"
        style={{
          fontFamily: "Inter_500Medium",
          fontSize: 15,
          fontVariant: ["tabular-nums"]
        }}
      />
    </View>
  );
}

function Section({
  title,
  hint,
  delay,
  children
}: {
  title: string;
  hint?: string;
  delay: number;
  children: React.ReactNode;
}) {
  return (
    <MotiView
      from={{ opacity: 0, translateY: 8 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{ type: "spring", damping: 18, stiffness: 200, delay }}
      className="mt-5"
    >
      <View className="flex-row items-baseline justify-between mb-2">
        <Text variant="label" className="text-ink-3">
          {title}
        </Text>
        {hint ? (
          <Text variant="caption" className="text-ink-4">
            {hint}
          </Text>
        ) : null}
      </View>
      {children}
    </MotiView>
  );
}
