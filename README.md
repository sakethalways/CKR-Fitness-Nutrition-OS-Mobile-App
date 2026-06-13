# CKR Fitness — Nutrition OS

Internal trainer tool for CKR Fitness. Cross-platform mobile app (Expo / React Native).

## Stack

- **Expo SDK 51** + TypeScript + Expo Router (file-based routing)
- **NativeWind v4** (Tailwind for RN) with custom design tokens
- **Reanimated 3** + **Moti** for animations
- **Lucide** icons (no emoji)
- **Zustand** state, **expo-haptics**, **expo-blur**, **expo-print**
- Inter font family (400 / 500 / 600 / 700)

## Design system

Dark theme + lime-green accent. See `src/theme/tokens.ts` and `tailwind.config.js`.

| Token        | Value                       |
|--------------|-----------------------------|
| bg           | `#0A0B0D`                   |
| surface      | `#14161B`                   |
| elevated     | `#1C1F26`                   |
| lime (brand) | `#FE7F0B`                   |
| ink / ink-2  | `#FFFFFF` / `#94A3B8`       |
| line         | `rgba(255,255,255,0.08)`    |

Motion: spring(18, 180) primary, press scale `0.97`, stagger `45ms`, haptics on every tap.

## Running

```bash
npm install
npx expo start
```

Then scan the QR with the Expo Go app on your phone, or press `a` (Android emulator) / `i` (iOS simulator).

## Demo logins

| Role    | Name   | Password |
|---------|--------|----------|
| Trainer | Rohan  | ckr      |
| Trainer | Ananya | ckr      |
| Admin   | Admin  | ckr      |

## Project layout

```
app/                # Expo Router screens
  _layout.tsx       # Root: fonts + gesture handler + safe area
  index.tsx         # Auth redirect
  login.tsx         # Login screen
  (app)/            # Auth-gated stack
    _layout.tsx
    dashboard.tsx   # (Phase 1 placeholder — full version in Phase 2)
src/
  components/       # Screen, Card, Button, Input, Pressable, Text, Logo
  theme/tokens.ts   # Color / motion / spacing tokens
  store/auth.ts     # Zustand auth + static users
  lib/haptics.ts    # Haptic helpers
global.css          # Tailwind entry
tailwind.config.js  # Theme extension
```

## Build phases

- [x] **Phase 1** — Scaffold + design system + Login
- [ ] **Phase 2** — Dashboard + Client Profile
- [ ] **Phase 3** — Client Details Input + Calorie Calculator
- [ ] **Phase 4** — Meal Generator + Approve & Export
- [ ] **Phase 5** — Polish + final animation pass
