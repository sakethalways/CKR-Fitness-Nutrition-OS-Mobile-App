**Here is a complete, detailed, and ready-to-use prompt** you can copy-paste and give to your AI coding agent (Claude, Cursor, GPT, etc.).

**SYSTEM PROMPT / PROJECT BRIEF**

**Project Name:** CKR Fitness - Nutrition OS (Internal Trainer Tool)

**Project Overview**  
Build a complete **cross-platform mobile application** for CKR Fitness trainers. This is an **internal tool** that helps trainers efficiently create personalized weekly meal plans for their clients, manage client data, calculate calories, generate meal options, export plans, and collect feedback through ratings.

The app is **not client-facing** in the first version. It is used only by trainers and admins.

**Core Purpose**  
Enable trainers to go from client profile → calorie calculation → meal plan generation → export → rating feedback loop in the fastest and smoothest way possible.

---

### **All Screens & Exact Features (Based on Provided PDF)**

**Screen 1: Login**
- Trainer Name + Password login
- Support two roles: **Trainer** (sees only own clients) and **Admin** (sees all clients)
- Clean dark UI

**Screen 2: Dashboard (My Clients)**
- Stats cards:
  - Active Clients
  - Plans Built (this week)
  - Average Meal Rating
- List of clients with: Name (initials), Age/Gender, Weight, Last plan date, Tags
- "+ New Client Plan" bright button

**Screen 3: Client Profile**
- Client header with all basic info + tags + goal
- Trainer Notes section
- Current Calorie Target & Protein Target
- Plan History (Week X - Active/Past with calorie and avg rating)
- Prominent **"Generate New Plan"** button

**Screen 4: Client Details Input**
- Form with:
  - Client Name, Goal, Age/Gender, Weight/Height
  - Activity Level (radio buttons: Sedentary, Lightly Active, Moderate, Very Active)
  - **Multi-select tags**: Client Type (Vegetarian, Busy Pro, Sweet Craving, Standard)
  - Food Preference (Veg / Non-Veg / Both)
  - Allergen Tags (multi-select: Dairy, Gluten, Nuts, Eggs, None)
  - Trainer Notes (textarea)
  - Classification: **Simple** (Generate Plan) vs **Complex** (Block generation & show consultation booking)
- If Complex → Show message and block plan generation

**Screen 5: Calorie Calculator**
- Uses **Mifflin-St Jeor** formula for auto BMR & TDEE
- Display: BMR, TDEE, Deficit, Auto Target
- Allow trainer to **manually override** any value
- Final Calorie Target, Protein Target, Deficit Type, Carbs & Fats (auto calculated)
- "Generate Meal Options" button

**Screen 6: Meal Options Generated**
- Show **Daily Calorie Range** guidance (e.g., stay between 1,380 – 1,520 kcal)
- 4 meal slots: Breakfast, Lunch, Dinner, Snack
- Total 8 meal options distributed across slots
- Each meal card shows:
  - Meal Name
  - Recipe reference (e.g., Recipe | Ep 23)
  - Calories
  - Macros (C / P / F)
  - Star rating
- Content gap flagging (e.g., "No FDOE episode yet")
- Any combination of one meal per slot should keep the client within calorie target

**Screen 7: Approve & Export**
- Two export options:
  1. **Download PDF** — Branded plan with all 8 options and calorie range
  2. **Copy for WhatsApp** — Plain text version
- Input fields to enter **ratings (out of 10)** for each meal from client feedback
- "Save Ratings and Done" button
- Logic: Ratings < 4 → remove from future rotation; Ratings ≥ 8 → prioritize for similar client types

---

### **Key Business Rules & Features**

- Allergens are **automatically excluded** from meal generation
- Multi-select tags are important (e.g., Vegetarian + Sweet Craving)
- All meals in one plan belong to the same calorie bracket
- Rating system feeds into future meal sorting/prioritization
- Trainer can only see their own clients (except Admin)
- Simple vs Complex client classification controls plan generation

---

### **Technical Requirements & Tech Stack Options**

**Primary Recommendation (Best Choice):**
- **Expo (React Native)** + **Supabase** (PostgreSQL + Auth + Storage)
- Reasons: Fastest development, excellent Supabase integration, one codebase for Android + iOS, easy PDF generation, real-time capabilities.

**Alternative Tech Stacks:**

1. **Flutter + Supabase** (Excellent UI control, single codebase)
2. **React Native CLI + Supabase** (More control than Expo)
3. **Kotlin Multiplatform** (Modern, but steeper learning curve)
4. **Native**:
   - Kotlin (Android) + Swift (iOS) → Two separate codebases (not recommended)
5. **Backend Options**:
   - Supabase (strongly preferred)
   - Firebase
   - Node.js + PostgreSQL

**Must-Have Technical Features:**
- Dark theme with lime green (# lime accents) as primary brand color
- Smooth navigation (Expo Router or React Navigation)
- Role-based access (Trainer vs Admin)
- Row Level Security in Supabase
- Offline support where possible
- Clean, modern, card-based UI matching the PDF design
- Proper state management (Zustand / Riverpod / Redux)
- PDF generation capability
- Share functionality for WhatsApp

---

### **Data & Workflow**

**Complete User Workflow:**
1. Login → Dashboard
2. Select or create new client
3. Fill/Edit client details + tags
4. Calculate calories (auto + manual override)
5. Generate meal options
6. Review 8 options across 4 slots
7. Approve → Export (PDF/WhatsApp)
8. After client feedback → Enter ratings → Save (updates database)

**Future Readiness:**
- Design database with proper relationships so that meal ratings influence future recommendations.
- Prepare for a future Client-facing app (separate roles).

---

**Deliverables Expected:**
- Full working mobile app (Android + iOS)
- Clean, well-organized, commented code
- Proper folder structure
- Supabase schema + RLS policies
- Role-based navigation
- All 7 screens implemented exactly as per PDF
- Static data for prototype phase (easy to switch to real Supabase later)

**Design Direction:**  
Follow the dark theme with lime green accents shown in the PDF. Make it feel premium, fast, and trainer-friendly.

**Success Criteria:**  
The app should feel exactly like the PDF screens when completed, with smooth flow from login to export.
