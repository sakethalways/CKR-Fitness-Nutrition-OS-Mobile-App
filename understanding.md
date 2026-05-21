**✅ Full Analysis Complete: CKR Fitness Nutrition OS Mobile App**
 Below is a **structured, complete breakdown** of the app — workflow, screens, features, data flow, UI/UX patterns, technical considerations, and recommendations for building the **mobile application**.

### 1. Overall Purpose
**Nutrition OS** is an **internal trainer tool** (not client-facing) for CKR Fitness trainers to:
- Manage clients
- Generate personalized weekly meal plans
- Export plans (PDF/WhatsApp)
- Collect feedback and improve future plans via ratings

It’s a **trainer productivity app** focused on speed and simplicity for creating Indian-style meal plans (veg-heavy, with recipes referencing "Ep 23", "FDOE", etc.).

### 2. High-Level Workflow (End-to-End)

1. **Login** → Trainer (or Admin)
2. **Dashboard** (My Clients) → See stats + list of clients
3. **Select / Create Client** → Client Profile
4. **Client Details Input** (multi-select tags + notes)
5. **Calorie Calculator** (Mifflin-St Jeor + overrides)
6. **Generate Meal Plan** → 8 meal options across 4 slots (Breakfast, Lunch, Dinner, Snack)
7. **Approve + Export** (PDF or WhatsApp text)
8. **Later**: Weekly check-in → Enter ratings → Ratings update database & influence future generations

### 3. Detailed Screen-by-Screen Breakdown

| Screen | Purpose | Key Elements | Notes / Logic |
|--------|--------|--------------|---------------|
| **S1: Login** | Authentication | Trainer Name, Password, Login button | Trainers see **only their clients**. Admin sees all. |
| **S2: Dashboard** | Overview | Stats cards (Active Clients, Plans Built, Avg Rating)<br>Client list (short cards with name, age/gender/weight, last plan, tags)<br>**+ New Client Plan** button | Simple home screen. |
| **S3: Client Profile** | Central hub | Client header (name, details, tags, goal)<br>Trainer Notes<br>Current targets (calories, protein)<br>Plan history (Week X — Active/Past + rating)<br>**Generate New Plan** button | One-click plan generation. |
| **S4: Client Details Input** | Data collection | Form with multi-select tags:<br>• Client Type (Vegetarian, Busy Pro, Sweet Craving, Standard)<br>• Food Preference (Veg / Non-Veg / Both)<br>• Allergens (Dairy, Gluten, Nuts, Eggs, None)<br>Activity Level (radio)<br>Trainer Notes<br>Classification: **Simple** (generate plan) vs **Complex** (block & book consultation) | Allergens are **automatically excluded** from meal generation. |
| **S5: Calorie Calculator** | Macro calculation | Auto BMR (Mifflin-St Jeor), TDEE, Deficit, Auto Target<br>Manual overrides for everything<br>Final Calorie Target + Protein Target | Trainer can adjust freely. |
| **S6: Meal Options** | Core generation | 4 slots: Breakfast, Lunch, Dinner, Snack<br>8 total options (multiple per slot)<br>Each meal shows: Name, Recipe ref (Ep XX), kcal, macros (C/P/F), Rating ★<br>Daily calorie range guidance | All meals in same bracket → any combination stays on target.<br>Content gap flagging (e.g., "No FDOE yet"). |
| **S7: Export & Rating** | Close loop | Download PDF (branded)<br>Copy for WhatsApp (plain text)<br>Rating input for each meal (1-10)<br>**Save Ratings** (updates DB) | Ratings <4 → remove from rotation<br>Ratings ≥8 → prioritize for similar clients |

### 4. Key Features & Business Logic

- **Multi-select tags** are very important (e.g., Vegetarian + Sweet Craving).
- **Allergen exclusion** is automatic.
- **Simple vs Complex clients** — Complex clients cannot generate plans directly.
- **Meal compatibility** — System ensures any pick from each slot keeps total calories in range.
- **Rating feedback loop** — Critical for long-term personalization (affects sorting/prioritization).
- **Recipe referencing** — Meals linked to video episodes (FDOE = ? probably "Full Day Of Eating").
- **Admin vs Trainer** roles.

### 5. Data Model (Suggested Entities)

- **Trainer** (id, name, isAdmin, clients[])
- **Client** (id, name, age, gender, weight, height, goal, tags[], allergens[], notes, activityLevel, classification)
- **CalorieTarget** (clientId, bmr, tdee, deficit, finalTarget, protein, carbs, fats, date)
- **MealPlan** (id, clientId, week, calorieRange, status: active/past)
- **MealOption** (id, name, recipeRef, kcal, carbs, protein, fat, rating, slotType: breakfast/lunch/dinner/snack)
- **PlanMealSelection** (planId, slot, selectedMealId)
- **MealRating** (clientId or planId, mealId, rating, date)

### 6. Tech Stack Recommendations (Mobile)

**Frontend (Mobile):**
- **React Native** (best choice — one codebase for iOS + Android) or **Flutter**
- State management: Zustand / Redux Toolkit / Riverpod
- UI Library: NativeBase, Tamagui, or Tailwind + NativeWind

**Backend:**
- Firebase (fastest for MVP — Auth, Firestore, Storage, Functions)
- OR Node.js + Express + MongoDB / Supabase

**Other:**
- PDF generation: `react-native-pdf-lib` or backend service
- WhatsApp sharing: Deep link or plain text copy
- Image handling for meal photos (future)

### 7. UI/UX Patterns from PDF
- Dark theme dominant (black cards, lime green accents — CKR brand color)
- Bold lime green primary buttons
- Clean, card-based layout
- Very mobile-friendly already (large touch targets)

### 8. Next Steps for You (Development Roadmap)

**Phase 1: Foundation**
- Auth (Trainer login)
- Dashboard + Client list
- Client CRUD + detailed form (multi-selects)

**Phase 2: Core Engine**
- Calorie calculator (implement Mifflin-St Jeor formula)
- Meal database + filtering logic (by tags/allergens)
- Plan generation screen

**Phase 3: Polish**
- Export (PDF + WhatsApp)
- Rating system + feedback loop
- History & stats

**Phase 4: Advanced**
- Admin panel
- Smart sorting based on ratings
- Notifications, search, etc.

