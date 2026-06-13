// Brand accent = CKR orange (sampled from the ckrfitness.com logo).
// Token names kept as "lime" so every existing usage re-skins automatically.
// ROLLBACK: previous palette was lime #C6F432 / dim #9FCC1A / glow #D8FF5C
// and rgba(198,244,50,…) — swap these three values (and the same trio in
// tailwind.config.js) back to restore the old look.
export const colors = {
  bg: "#0A0B0D",
  surface: "#14161B",
  elevated: "#1C1F26",
  sunken: "#070809",
  lime: "#FE7F0B",
  limeDim: "#D96A05",
  limeGlow: "#FFA94D",
  ink: "#FFFFFF",
  ink2: "#94A3B8",
  ink3: "#64748B",
  ink4: "#475569",
  line: "rgba(255,255,255,0.08)",
  lineStrong: "rgba(255,255,255,0.14)",
  success: "#34D399",
  warn: "#FBBF24",
  danger: "#F87171",
  info: "#60A5FA"
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xl2: 24,
  pill: 9999
} as const;

export const space = {
  px: 1,
  0.5: 2,
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
  16: 64
} as const;

export const motion = {
  spring: { damping: 18, stiffness: 180, mass: 0.9 },
  springSoft: { damping: 22, stiffness: 140, mass: 1 },
  springSnappy: { damping: 14, stiffness: 240, mass: 0.7 },
  timing: { duration: 240 },
  enter: 280,
  exit: 200,
  stagger: 45
} as const;
