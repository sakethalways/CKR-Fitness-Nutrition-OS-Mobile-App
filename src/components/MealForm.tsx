import React, { useMemo, useState } from "react";
import { View } from "react-native";
import { Meal, MealType, MEAL_TYPES } from "@/data/types";
import { Text } from "@/components/Text";
import { Input } from "@/components/Input";
import { Textarea } from "@/components/Textarea";
import { Stepper } from "@/components/Stepper";
import { SegmentedControl } from "@/components/SegmentedControl";
import { ChipSelector } from "@/components/ChipSelector";
import { Pressable } from "@/components/Pressable";
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
  isShootPriority: boolean;
  clientTags: string[];
  allergens: string;
  baseDescription: string;
  proteinAnchor: string;
  notes: string;
  rating: number;
};

const CALORIE_BRACKETS = {
  "Breakfast": ["350–400 kcal", "400–450 kcal", "450–500 kcal", "500–550 kcal"],
  "Lunch / Dinner": ["350–400 kcal", "400–450 kcal", "450–500 kcal", "500–550 kcal"],
  "Snack": ["150–200 kcal", "200–250 kcal", "250–300 kcal"]
};

const CLIENT_TAG_OPTIONS = [
  "Sweet Craving",
  "Busy",
  "Standard",
  "Vegetarian",
  "Veg"
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
    const [isShootPriority, setIsShootPriority] = useState(initialMeal?.isShootPriority || false);
    const [clientTags, setClientTags] = useState<string[]>(initialMeal?.clientTags || []);
    const [allergens, setAllergens] = useState(initialMeal?.allergens || "");
    const [baseDescription, setBaseDescription] = useState(initialMeal?.baseDescription || "");
    const [proteinAnchor, setProteinAnchor] = useState(initialMeal?.proteinAnchor || "");
    const [notes, setNotes] = useState(initialMeal?.notes || "");
    const [rating, setRating] = useState(initialMeal?.rating || 0);

    // Validation errors
    const [errors, setErrors] = useState<Partial<MealFormData>>({});

    const availableBrackets = useMemo(
      () => CALORIE_BRACKETS[mealType] || [],
      [mealType]
    );

    // Reset calBracket if mealType changes and current bracket not in new type
    React.useEffect(() => {
      if (!availableBrackets.includes(calBracket)) {
        setCalBracket(availableBrackets[0] || "350–400 kcal");
      }
    }, [mealType, availableBrackets, calBracket]);

    const validate = (): boolean => {
      const newErrors: Partial<MealFormData> = {};

      if (!mealName || mealName.trim().length < 3) {
        newErrors.mealName = true;
      }
      if (mealNumber < 1) {
        newErrors.mealNumber = true;
      }
      if (!quantities || quantities.trim().length < 10) {
        newErrors.quantities = true;
      }
      if (calories <= 0) {
        newErrors.calories = true;
      }
      if (proteinG < 0) {
        newErrors.proteinG = true;
      }
      if (carbsG < 0) {
        newErrors.carbsG = true;
      }
      if (fatG < 0) {
        newErrors.fatG = true;
      }

      setErrors(newErrors);
      return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = () => {
      if (!validate()) {
        haptics.warning();
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
        isShootPriority,
        clientTags,
        allergens: allergens.trim(),
        baseDescription: baseDescription.trim(),
        proteinAnchor: proteinAnchor.trim(),
        notes: notes.trim(),
        rating: Math.min(10, Math.max(0, Math.round(rating)))
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
              error={errors.mealName}
              errorText="Min 3 characters required"
            />
            <View className="flex-row gap-3">
              <View className="flex-1">
                <Text variant="caption" className="text-ink-3 mb-1">
                  Meal Number
                </Text>
                <Stepper
                  value={mealNumber}
                  onChangeValue={(v) => {
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
                  options={["Veg", "Non-Veg"]}
                  value={diet}
                  onChangeValue={(v) => setDiet(v as "Veg" | "Non-Veg")}
                />
              </View>
            </View>
            <View>
              <Text variant="caption" className="text-ink-3 mb-1">
                Meal Type
              </Text>
              <SegmentedControl
                options={MEAL_TYPES}
                value={mealType}
                onChangeValue={(v) => setMealType(v as MealType)}
              />
            </View>
            <View>
              <Text variant="caption" className="text-ink-3 mb-1">
                Calorie Bracket
              </Text>
              <SegmentedControl
                options={availableBrackets}
                value={calBracket}
                onChangeValue={setCalBracket}
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
                  onChangeValue={(v) => {
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
                  error={errors.proteinG}
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
                  error={errors.carbsG}
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
                  error={errors.fatG}
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
            error={errors.quantities}
            errorText="Min 10 characters required"
            minHeight={80}
          />
        </View>

        {/* TAGS & PRIORITY SECTION */}
        <View className="mb-6">
          <Text variant="label" className="text-ink-3 mb-3">
            TAGS & PRIORITY
          </Text>
          <View className="gap-3">
            <View>
              <Text variant="caption" className="text-ink-3 mb-2">
                Client Tags
              </Text>
              <ChipSelector
                options={CLIENT_TAG_OPTIONS}
                selected={clientTags}
                onSelectionChange={setClientTags}
              />
            </View>
            <Pressable
              onPress={() => setIsShootPriority(!isShootPriority)}
              className="flex-row items-center gap-2 p-3 rounded-lg border border-line bg-surface"
            >
              <View
                className={`w-5 h-5 rounded border-2 items-center justify-center ${
                  isShootPriority ? "bg-lime border-lime" : "border-line"
                }`}
              >
                {isShootPriority && <Text className="text-black text-sm">✓</Text>}
              </View>
              <Text variant="body" className="text-ink">
                Shoot Priority (Featured)
              </Text>
            </Pressable>
          </View>
        </View>

        {/* METADATA SECTION */}
        <View className="mb-6">
          <Text variant="label" className="text-ink-3 mb-3">
            METADATA
          </Text>
          <View className="gap-3">
            <Input
              label="Allergens"
              placeholder="e.g., Nuts · Dairy if whey"
              value={allergens}
              onChangeText={(v) => {
                setAllergens(v);
                handleFieldChange("allergens");
              }}
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
                onChangeValue={(v) => setRating(Math.min(10, Math.max(0, v)))}
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
