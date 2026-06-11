import React, { useMemo, useState } from "react";
import { View, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { MotiView } from "moti";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Phone, User2, Lock } from "lucide-react-native";
import { Text } from "@/components/Text";
import { Input } from "@/components/Input";
import { Stepper } from "@/components/Stepper";
import { SegmentedControl } from "@/components/SegmentedControl";
import { Button } from "@/components/Button";
import { BottomBar } from "@/components/BottomBar";
import { Gender, Trainer } from "@/data/types";
import { colors } from "@/theme/tokens";
import * as haptics from "@/lib/haptics";

export type TrainerFormData = {
  name: string;
  mobile: string;
  age: number;
  gender: Gender;
  password: string;
};

type Props = {
  initial?: Partial<Trainer>;
  /** in edit mode, password is optional (only set to change it) */
  mode: "create" | "edit";
  submitLabel: string;
  onSubmit: (data: TrainerFormData) => void | Promise<void>;
  takenMobiles?: string[]; // for uniqueness check
  headerTitle: string;
  headerSubtitle: string;
};

export function TrainerForm({
  initial,
  mode,
  submitLabel,
  onSubmit,
  takenMobiles = [],
  headerTitle,
  headerSubtitle
}: Props) {
  const insets = useSafeAreaInsets();
  const [name, setName] = useState(initial?.name ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [age, setAge] = useState(initial?.age ?? 28);
  const [gender, setGender] = useState<Gender>(initial?.gender ?? "M");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{
    name?: string;
    mobile?: string;
    password?: string;
  }>({});

  const isValid = useMemo(() => {
    if (name.trim().length < 2) return false;
    if (mobile.length !== 10) return false;
    if (mode === "create" && password.length < 4) return false;
    return true;
  }, [name, mobile, password, mode]);

  // Locks the button while onSubmit is in flight so a double-tap can't create
  // two trainers (or fire the edge function twice).
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (submitting) return;
    const e: typeof errors = {};
    if (name.trim().length < 2) e.name = "Enter a name";
    if (mobile.length !== 10) e.mobile = "Mobile must be 10 digits";
    if (takenMobiles.includes(mobile))
      e.mobile = "Another trainer already uses this mobile";
    if (mode === "create" && password.length < 4)
      e.password = "Password must be at least 4 characters";
    if (Object.keys(e).length > 0) {
      setErrors(e);
      haptics.warning();
      return;
    }
    setSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        mobile,
        age,
        gender,
        password: password.trim()
      });
    } finally {
      setSubmitting(false);
    }
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

          <Section title="DETAILS" delay={60}>
            <Input
              label="Name"
              placeholder="e.g. Rohan Mehta"
              value={name}
              onChangeText={(t) => {
                setName(t);
                if (errors.name) setErrors({ ...errors, name: undefined });
              }}
              autoCapitalize="words"
              error={errors.name}
              iconLeft={<User2 size={16} color={colors.ink2} strokeWidth={2} />}
            />
            <View className="mt-3">
              <Input
                label="Mobile Number"
                placeholder="10-digit mobile"
                value={mobile}
                onChangeText={(t) => {
                  setMobile(t.replace(/\D/g, "").slice(0, 10));
                  if (errors.mobile)
                    setErrors({ ...errors, mobile: undefined });
                }}
                keyboardType="number-pad"
                autoCapitalize="none"
                error={errors.mobile}
                iconLeft={<Phone size={16} color={colors.ink2} strokeWidth={2} />}
              />
            </View>
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
                min={18}
                max={80}
                suffix="yrs"
              />
              <View style={{ flex: 2 }} />
            </View>
          </Section>

          <Section
            title={mode === "create" ? "PASSWORD" : "CHANGE PASSWORD"}
            hint={mode === "edit" ? "Leave blank to keep current" : undefined}
            delay={120}
          >
            <Input
              label={mode === "create" ? "Password" : "New password"}
              placeholder={
                mode === "create" ? "Set a password" : "Leave blank to keep"
              }
              value={password}
              onChangeText={(t) => {
                setPassword(t);
                if (errors.password)
                  setErrors({ ...errors, password: undefined });
              }}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              autoComplete="off"
              error={errors.password}
              iconLeft={<Lock size={16} color={colors.ink2} strokeWidth={2} />}
            />
            <Text variant="caption" className="text-ink-3 mt-2">
              {mode === "create"
                ? "Share this with the trainer separately. They'll use their mobile + this password to sign in."
                : "Only enter a new password if you want to replace the current one."}
            </Text>
          </Section>
        </ScrollView>
      </KeyboardAvoidingView>

      <BottomBar>
        <Button
          label={submitLabel}
          size="lg"
          fullWidth
          disabled={!isValid}
          loading={submitting}
          onPress={submit}
        />
      </BottomBar>
    </>
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
