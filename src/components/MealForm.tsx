import React, { useMemo, useState } from "react";
import { View, Alert } from "react-native";
import { Allergen, Meal, MealType, MEAL_TYPES, MEAL_ALLERGENS } from "@/data/types";
import { Text } from "@/components/Text";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Stepper } from "@/components/Stepper";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ChipSelector } from "@/components/ChipSelector";
import { Pressable } from "@/components/Pressable";
import { isInstagramUrl } from "@/lib/reels";
import * as haptics from "@/lib/haptics";

export type MealFormData = {
  mealName: string;
  mealNumber: number;
  mealType: MealType;
  diet: "Veg" | "Non-Veg";
  calBracket: string;
  quantities: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  clientTags: string[];
  allergens: Allergen[];
  baseDescription: string;
  proteinAnchor: string;
  notes: string;
  rating: number;
  mealSection: string;
  reelUrl: string | null;
  mealCode: string;
};

// Must stay in sync with CAL_BRACKET_VALUES in the Google Sheet script
// (integrations/google-sheet-sync/Code.gs). The en-dash "–" and " kcal"
// suffix must match the stored values exactly so synced meals map cleanly.
const MAIN_BRACKETS = [
  { value: "350–400 kcal", label: "350–400" },
  { value: "400–450 kcal", label: "400–450" },
  { value: "450–500 kcal", label: "450–500" },
  { value: "500–550 kcal", label: "500–550" },
  { value: "550–600 kcal", label: "550–600" },
  { value: "600–650 kcal", label: "600–650" },
  { value: "650–700 kcal", label: "650–700" },
  { value: "700–750 kcal", label: "700–750" }
];

const CALORIE_BRACKETS = {
  "Breakfast": MAIN_BRACKETS,
  "Lunch / Dinner": MAIN_BRACKETS,
  "Snack": [
    { value: "150–200 kcal", label: "150–200" },
    { value: "200–250 kcal", label: "200–250" },
    { value: "250–300 kcal", label: "250–300" },
    { value: "300–350 kcal", label: "300–350" }
  ]
};

// Single-select wrapping chip row. Used for the calorie bracket because there
// are now up to eight options for main meals — too many to fit legibly in a
// horizontal SegmentedControl, which would squash each label. Wrapping chips
// stay readable and tap-friendly at any count.
function BracketChips({
  options,
  value,
  onChange
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <View className="flex-row flex-wrap" style={{ gap: 8 }}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            scaleTo={0.96}
            haptic="light"
          >
            <View
              className="rounded-full border px-3.5 py-2"
              style={{
                backgroundColor: active
                  ? "rgba(254,127,11,0.18)"
                  : "rgba(255,255,255,0.04)",
                borderColor: active ? "#FE7F0B" : "rgba(255,255,255,0.10)"
              }}
            >
              <Text
                variant="bodyMedium"
                style={{
                  color: active ? "#FFA94D" : "#94A3B8",
                  fontSize: 13,
                  fontFamily: active ? "Inter_600SemiBold" : "Inter_500Medium"
                }}
              >
                {o.label}
              </Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const CLIENT_TAG_OPTIONS = [
  "Sweet Craving",
  "Busy",
  "Standard",
  "Vegetarian",
  "Veg"
];

const MEAL_TYPE_OPTIONS = MEAL_TYPES.map(t => ({ value: t, label: t }));
const DIET_OPTIONS = [
  { value: "Veg" as const, label: "Veg" },
  { value: "Non-Veg" as const, label: "Non-Veg" }
];

export interface MealFormProps {
  initialMeal?: Meal;
  onSubmit: (data: MealFormData) => void;
  isLoading?: boolean;
}

export const MealForm = React.forwardRef<any, MealFormProps>(
  ({ initialMeal, onSubmit, isLoading }, ref) => {
    const [mealName, setMealName] = useState(initialMeal?.mealName || "");
    const [mealNumber, setMealNumber] = useState(initialMeal?.mealNumber || 1);
    const [mealType, setMealType] = useState<MealType>(initialMeal?.mealType || "Breakfast");
    const [diet, setDiet] = useState<"Veg" | "Non-Veg">(initialMeal?.diet || "Veg");
    const [calBracket, setCalBracket] = useState(initialMeal?.calBracket || "350–400 kcal");
    const [quantities, setQuantities] = useState(initialMeal?.quantities || "");
    const [calories, setCalories] = useState(initialMeal?.calories || 0);
    const [proteinG, setProteinG] = useState(initialMeal?.proteinG || 0);
    const [carbsG, setCarbsG] = useState(initialMeal?.carbsG || 0);
    const [fatG, setFatG] = useState(initialMeal?.fatG || 0);
    const [clientTags, setClientTags] = useState<string[]>(initialMeal?.clientTags || []);
    const [allergens, setAllergens] = useState<Allergen[]>(initialMeal?.allergens || []);
    const [baseDescription, setBaseDescription] = useState(initialMeal?.baseDescription || "");
    const [proteinAnchor, setProteinAnchor] = useState(initialMeal?.proteinAnchor || "");
    const [notes, setNotes] = useState(initialMeal?.notes || "");
    const [rating, setRating] = useState(initialMeal?.rating || 0);
    const [reelUrl, setReelUrl] = useState(initialMeal?.reelUrl || "");

    // Validation errors (field → has-error flag)
    const [errors, setErrors] = useState<
      Partial<Record<keyof MealFormData, boolean>>
    >({});

    const availableBrackets = useMemo(() => {
      const base = CALORIE_BRACKETS[mealType] || [];
      // Preserve a bracket the canonical list doesn't know about — e.g. a value
      // added in the Google Sheet but not yet mirrored here, or legacy data.
      // Surfacing it as a selectable chip means opening such a meal to edit
      // never silently drops or rewrites its bracket (which would corrupt the
      // row on the next save and push the wrong value back to the Sheet).
      if (calBracket && !base.some((b) => b.value === calBracket)) {
        const label = calBracket.replace(/\s*kcal\s*$/i, "").trim() || calBracket;
        return [...base, { value: calBracket, label }];
      }
      return base;
    }, [mealType, calBracket]);

    // Reset the bracket ONLY when the user actively switches the meal TYPE to
    // one whose canonical brackets can't include the current value (e.g. a main
    // meal → Snack). We deliberately do NOT reset on first load of a meal whose
    // bracket is unknown — that value is preserved via availableBrackets above,
    // so a synced higher-bracket meal stays intact instead of being clobbered.
    const prevTypeRef = React.useRef(mealType);
    React.useEffect(() => {
      if (prevTypeRef.current === mealType) return;
      prevTypeRef.current = mealType;
      const canonical = CALORIE_BRACKETS[mealType] || [];
      if (!canonical.some((b) => b.value === calBracket)) {
        setCalBracket(canonical[0]?.value || "350–400 kcal");
      }
    }, [mealType, calBracket]);

    // Returns a list of human-readable problems (empty = valid).
    const validate = (): string[] => {
      const newErrors: Partial<Record<keyof MealFormData, boolean>> = {};
      const problems: string[] = [];

      if (!mealName || mealName.trim().length < 3) {
        newErrors.mealName = true;
        problems.push("Meal name (at least 3 characters)");
      }
      if (mealNumber < 1) {
        newErrors.mealNumber = true;
        problems.push("Meal number");
      }
      if (!quantities || quantities.trim().length < 10) {
        newErrors.quantities = true;
        problems.push("Quantities (at least 10 characters)");
      }
      if (calories <= 0) {
        newErrors.calories = true;
        problems.push("Calories (must be greater than 0)");
      }
      if (proteinG < 0) {
        newErrors.proteinG = true;
        problems.push("Protein cannot be negative");
      }
      if (carbsG < 0) {
        newErrors.carbsG = true;
        problems.push("Carbs cannot be negative");
      }
      if (fatG < 0) {
        newErrors.fatG = true;
        problems.push("Fat cannot be negative");
      }
      // Reel link is optional, but if filled it must be a real Instagram link.
      if (reelUrl.trim().length > 0 && !isInstagramUrl(reelUrl)) {
        newErrors.reelUrl = true;
        problems.push("Reel link must be a valid instagram.com URL (or left empty)");
      }

      setErrors(newErrors);
      return problems;
    };

    const handleSubmit = () => {
      const problems = validate();
      if (problems.length > 0) {
        haptics.warning();
        Alert.alert(
          "Can't save yet",
          "Please fix the following:\n\n• " + problems.join("\n• ")
        );
        return;
      }

      const formData: MealFormData = {
        mealName: mealName.trim(),
        mealNumber,
        mealType,
        diet,
        calBracket,
        quantities: quantities.trim(),
        calories: Math.round(calories),
        proteinG: Math.round(proteinG * 10) / 10,
        carbsG: Math.round(carbsG * 10) / 10,
        fatG: Math.round(fatG * 10) / 10,
        clientTags,
        allergens,
        baseDescription: baseDescription.trim(),
        proteinAnchor: proteinAnchor.trim(),
        notes: notes.trim(),
        rating: Math.min(10, Math.max(0, Math.round(rating))),
        // Section mirrors the meal type — keeps DB meal_section consistent.
        mealSection: mealType,
        // Empty link → null (no button shown anywhere).
        reelUrl: reelUrl.trim() ? reelUrl.trim() : null,
        // Code is per-dish; derive from the meal number so it stays consistent.
        mealCode: `M${mealNumber}`
      };

      onSubmit(formData);
    };

    const handleFieldChange = (field: string) => {
      if (errors[field as keyof MealFormData]) {
        setErrors((prev) => ({
          ...prev,
          [field]: false
        }));
      }
    };

    return (
      <View className="flex-1">
        {/* BASIC INFO SECTION */}
        <View className="mb-6">
          <Text variant="label" className="text-ink-3 mb-3">
            BASIC INFO
          </Text>
          <View className="gap-3">
            <Input
              label="Meal Name"
              placeholder="e.g., Overnight Oats"
              value={mealName}
              onChangeText={(v) => {
                setMealName(v);
                handleFieldChange("mealName");
              }}
              error={errors.mealName ? "Min 3 characters required" : undefined}
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text variant="caption" className="text-ink-3 mb-1">
                  Meal Number
                </Text>
                <Stepper
                  value={mealNumber}
                  onChange={(v) => {
                    setMealNumber(Math.max(1, v));
                    handleFieldChange("mealNumber");
                  }}
                  min={1}
                  max={20}
                />
              </View>
              <View className="flex-1">
                <Text variant="caption" className="text-ink-3 mb-1">
                  Diet Type
                </Text>
                <SegmentedControl
                  options={DIET_OPTIONS}
                  value={diet}
                  onChange={(v) => setDiet(v as "Veg" | "Non-Veg")}
                />
              </View>
            </View>
            <View>
              <Text variant="caption" className="text-ink-3 mb-1">
                Meal Type
              </Text>
              <SegmentedControl
                options={MEAL_TYPE_OPTIONS}
                value={mealType}
                onChange={(v) => setMealType(v as MealType)}
              />
            </View>
            <View>
              <Text variant="caption" className="text-ink-3 mb-1">
                Calorie Bracket
              </Text>
              <BracketChips
                options={availableBrackets}
                value={calBracket}
                onChange={setCalBracket}
              />
            </View>
          </View>
        </View>

        {/* NUTRITION SECTION */}
        <View className="mb-6">
          <Text variant="label" className="text-ink-3 mb-3">
            NUTRITION
          </Text>
          <View className="gap-3">
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Stepper
                  label="Calories"
                  value={calories}
                  onChange={(v) => {
                    setCalories(Math.max(0, v));
                    handleFieldChange("calories");
                  }}
                  min={0}
                  max={1000}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Protein (g)"
                  placeholder="0.0"
                  value={proteinG.toString()}
                  onChangeText={(v) => {
                    setProteinG(parseFloat(v) || 0);
                    handleFieldChange("proteinG");
                  }}
                  keyboardType="decimal-pad"
                  error={errors.proteinG ? "Invalid" : undefined}
                />
              </View>
            </View>
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Input
                  label="Carbs (g)"
                  placeholder="0.0"
                  value={carbsG.toString()}
                  onChangeText={(v) => {
                    setCarbsG(parseFloat(v) || 0);
                    handleFieldChange("carbsG");
                  }}
                  keyboardType="decimal-pad"
                  error={errors.carbsG ? "Invalid" : undefined}
                />
              </View>
              <View className="flex-1">
                <Input
                  label="Fat (g)"
                  placeholder="0.0"
                  value={fatG.toString()}
                  onChangeText={(v) => {
                    setFatG(parseFloat(v) || 0);
                    handleFieldChange("fatG");
                  }}
                  keyboardType="decimal-pad"
                  error={errors.fatG ? "Invalid" : undefined}
                />
              </View>
            </View>
          </View>
        </View>

        {/* QUANTITIES SECTION */}
        <View className="mb-6">
          <Textarea
            label="Quantities"
            placeholder="e.g., Rolled oats 40g · Almond milk 150ml..."
            value={quantities}
            onChangeText={(v) => {
              setQuantities(v);
              handleFieldChange("quantities");
            }}
            minHeight={80}
          />
          {errors.quantities ? (
            <Text variant="caption" className="text-danger mt-1.5">
              Min 10 characters required
            </Text>
          ) : null}
        </View>

        {/* TAGS SECTION */}
        <View className="mb-6">
          <Text variant="label" className="text-ink-3 mb-3">
            CLIENT TAGS
          </Text>
          <ChipSelector
            options={CLIENT_TAG_OPTIONS}
            value={clientTags}
            onChange={setClientTags}
          />
        </View>

        {/* ALLERGENS SECTION — structured tags, matched against client allergens */}
        <View className="mb-6">
          <Text variant="label" className="text-ink-3 mb-2">
            ALLERGENS (CONTAINS)
          </Text>
          <Text variant="caption" className="text-ink-3 mb-3">
            Select every allergen this meal contains. Clients flagged with any of
            these will never be served this meal.
          </Text>
          <ChipSelector<Allergen>
            options={MEAL_ALLERGENS}
            value={allergens}
            onChange={setAllergens}
          />
        </View>

        {/* METADATA SECTION */}
        <View className="mb-6">
          <Text variant="label" className="text-ink-3 mb-3">
            METADATA
          </Text>
          <View className="gap-3">
            <Input
              label="Instagram Reel Link (optional)"
              placeholder="https://www.instagram.com/reel/..."
              value={reelUrl}
              onChangeText={(v) => {
                setReelUrl(v);
                handleFieldChange("reelUrl");
              }}
              autoCapitalize="none"
              keyboardType="url"
              error={
                errors.reelUrl
                  ? "Enter a valid instagram.com link or leave empty"
                  : undefined
              }
            />
            <Textarea
              label="Base Description"
              placeholder="Fixed ingredients and calories..."
              value={baseDescription}
              onChangeText={setBaseDescription}
              minHeight={60}
            />
            <Textarea
              label="Protein Anchor"
              placeholder="What changes across brackets..."
              value={proteinAnchor}
              onChangeText={setProteinAnchor}
              minHeight={60}
            />
            <Textarea
              label="Notes"
              placeholder="e.g., Verified MFP, special prep instructions..."
              value={notes}
              onChangeText={setNotes}
              minHeight={60}
            />
            <View>
              <Text variant="caption" className="text-ink-3 mb-1">
                Rating (0-10)
              </Text>
              <Stepper
                value={rating}
                onChange={(v) => setRating(Math.min(10, Math.max(0, v)))}
                min={0}
                max={10}
              />
            </View>
          </View>
        </View>

        {/* Submit Button */}
        <View className="mt-4">
          <Pressable
            onPress={handleSubmit}
            disabled={isLoading}
            className={`p-4 rounded-lg ${
              isLoading ? "bg-lime/50" : "bg-lime"
            }`}
          >
            <Text
              variant="h3"
              className={isLoading ? "text-black/50" : "text-black"}
              style={{ textAlign: "center" }}
            >
              {isLoading ? "Saving..." : "Save Meal"}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
);

MealForm.displayName = "MealForm";
