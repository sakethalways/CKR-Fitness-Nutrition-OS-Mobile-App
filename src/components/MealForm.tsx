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

const CALORIE_BRACKETS = {
  "Breakfast": [
    { value: "350–400 kcal", label: "350–400" },
    { value: "400–450 kcal", label: "400–450" },
    { value: "450–500 kcal", label: "450–500" },
    { value: "500–550 kcal", label: "500–550" }
  ],
  "Lunch / Dinner": [
    { value: "350–400 kcal", label: "350–400" },
    { value: "400–450 kcal", label: "400–450" },
    { value: "450–500 kcal", label: "450–500" },
    { value: "500–550 kcal", label: "500–550" }
  ],
  "Snack": [
    { value: "150–200 kcal", label: "150–200" },
    { value: "200–250 kcal", label: "200–250" },
    { value: "250–300 kcal", label: "250–300" }
  ]
};

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

    const availableBrackets = useMemo(
      () => CALORIE_BRACKETS[mealType] || [],
      [mealType]
    );

    // Reset calBracket if mealType changes and current bracket not in new type
    React.useEffect(() => {
      const bracketValues = availableBrackets.map(b => b.value);
      if (!bracketValues.includes(calBracket)) {
        setCalBracket(availableBrackets[0]?.value || "350–400 kcal");
      }
    }, [mealType, availableBrackets, calBracket]);

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
              <SegmentedControl
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
