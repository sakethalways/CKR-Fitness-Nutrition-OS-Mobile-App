export type Goal = "Fat Loss" | "Muscle Gain" | "Maintain" | "Recomp";
export type ClientType =
  | "Vegetarian"
  | "Busy Pro"
  | "Sweet Craving"
  | "Standard";
export type FoodPref = "Veg" | "Non-Veg" | "Both";
export type Allergen = "Dairy" | "Gluten" | "Nuts" | "Eggs" | "None";
export type ActivityLevel =
  | "Sedentary"
  | "Lightly Active"
  | "Moderate"
  | "Very Active";
export type Gender = "M" | "F" | "Other";

export type ClientStatus = "Active" | "Critical" | "On Hold" | "Completed";
export const CLIENT_STATUSES: ClientStatus[] = [
  "Active",
  "Critical",
  "On Hold"
];

export type Role = "trainer" | "admin";

export type Trainer = {
  id: string;
  name: string;
  mobile: string; // 10-digit
  age: number;
  gender: Gender;
  password: string; // set by admin
  isActive: boolean;
  createdAt: string;
  initials: string;
  avatarUri?: string; // local URI from ImagePicker
};

export type Admin = {
  id: string;
  name: string;
  initials: string;
};

export type Client = {
  id: string;
  trainerId: string;
  name: string;
  initials: string;
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
  notes: string;
  phoneCountryCode?: string; // e.g. "+91"
  phoneNumber?: string; // local part, digits only
  calorieTarget?: number;
  proteinTarget?: number;
  lastPlanDate?: string;
  closedAt?: string;
  deletionRequestedBy?: string; // trainer id
  deletionRequestedAt?: string;
};

export type SlotType = "Breakfast" | "Lunch" | "Dinner" | "Snack";
export const SLOTS: SlotType[] = ["Breakfast", "Lunch", "Dinner", "Snack"];

export type Meal = {
  id: string;
  name: string;
  slot: SlotType;
  recipeRef: string | null;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
  foodPref: "Veg" | "Non-Veg";
  allergens: Allergen[];
  clientTypeBoost: ClientType[];
  baseRating: number;
};

export type Plan = {
  id: string;
  clientId: string;
  weekNumber: number;
  calorieRangeLow: number;
  calorieRangeHigh: number;
  status: "active" | "past";
  avgRating: number;
  createdAt: string;
  selectedMealIds?: string[];
  ratings?: Record<string, number>;
  ratedAt?: string;
  ratedBy?: string; // trainer id
};

export type MealPlanTemplate = {
  id: string;
  name: string;
  sourcePlanId: string;
  sourceClientName: string;
  savedByAdminId: string;
  selectedMealIds: string[];
  calorieRangeLow: number;
  calorieRangeHigh: number;
  tagSummary: string;
  createdAt: string;
};

export type NotificationKind =
  | "new_client"
  | "new_rating"
  | "client_critical"
  | "deletion_request"
  | "plan_change_request"
  | "admin_changed_plan"
  | "deletion_approved";

export type Notification = {
  id: string;
  recipientRole: Role;
  recipientId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  payload: {
    clientId?: string;
    planId?: string;
    trainerId?: string;
  };
  isRead: boolean;
  createdAt: string;
};
