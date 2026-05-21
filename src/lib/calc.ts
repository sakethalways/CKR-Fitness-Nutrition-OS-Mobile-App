import { ActivityLevel, Gender, Goal } from "@/data/types";

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  Sedentary: 1.2,
  "Lightly Active": 1.375,
  Moderate: 1.55,
  "Very Active": 1.725
};

const GOAL_DELTA: Record<Goal, number> = {
  "Fat Loss": -400,
  "Muscle Gain": 300,
  Maintain: 0,
  Recomp: -150
};

const PROTEIN_PER_KG: Record<Goal, number> = {
  "Fat Loss": 2.0,
  "Muscle Gain": 2.0,
  Maintain: 1.6,
  Recomp: 1.9
};

export type CalcInput = {
  age: number;
  gender: Gender;
  weight: number;
  height: number;
  activity: ActivityLevel;
  goal: Goal;
};

export type CalcResult = {
  bmr: number;
  tdee: number;
  delta: number;
  target: number;
  protein: number;
  carbs: number;
  fat: number;
  rangeLow: number;
  rangeHigh: number;
};

// Mifflin-St Jeor BMR
export const mifflinStJeor = ({
  weight,
  height,
  age,
  gender
}: Pick<CalcInput, "weight" | "height" | "age" | "gender">): number => {
  const base = 10 * weight + 6.25 * height - 5 * age;
  return Math.round(gender === "M" ? base + 5 : base - 161);
};

export const calculateAuto = (i: CalcInput): CalcResult => {
  const bmr = mifflinStJeor(i);
  const tdee = Math.round(bmr * ACTIVITY_FACTOR[i.activity]);
  const delta = GOAL_DELTA[i.goal];
  const target = Math.max(1200, tdee + delta);
  const protein = Math.round(i.weight * PROTEIN_PER_KG[i.goal]);
  // Fat = 25% of calories / 9 kcal per g
  const fat = Math.round((target * 0.25) / 9);
  // Carbs = remaining calories / 4 kcal per g
  const carbs = Math.max(
    0,
    Math.round((target - protein * 4 - fat * 9) / 4)
  );
  const rangeLow = Math.round(target * 0.95);
  const rangeHigh = Math.round(target * 1.05);
  return { bmr, tdee, delta, target, protein, carbs, fat, rangeLow, rangeHigh };
};

export const macrosFromTarget = (
  target: number,
  weight: number,
  goal: Goal,
  proteinOverride?: number
): { protein: number; carbs: number; fat: number } => {
  const protein =
    proteinOverride ?? Math.round(weight * PROTEIN_PER_KG[goal]);
  const fat = Math.round((target * 0.25) / 9);
  const carbs = Math.max(0, Math.round((target - protein * 4 - fat * 9) / 4));
  return { protein, carbs, fat };
};
