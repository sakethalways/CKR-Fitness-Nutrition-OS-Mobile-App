import { ImageSourcePropType } from "react-native";

// Statically-required so metro can bundle them. Random pick at render time.
export const LOADING_IMAGES: ImageSourcePropType[] = [
  require("../../assets/loading/loading-1.png"),
  require("../../assets/loading/loading-2.png"),
  require("../../assets/loading/loading-3.png"),
  require("../../assets/loading/loading-4.png"),
  require("../../assets/loading/loading-5.png")
];

export const FITNESS_QUOTES: string[] = [
  "Take care of your body. It's the only place you have to live. — Jim Rohn",
  "The body achieves what the mind believes.",
  "Strive for progress, not perfection.",
  "Discipline is choosing between what you want now and what you want most.",
  "Small steps every day add up to big results.",
  "Don't wish for it. Work for it.",
  "Your only competition is who you were yesterday.",
  "Eat well. Move well. Sleep well. Think well.",
  "Consistency is more important than intensity.",
  "Strong is the new beautiful.",
  "What you eat in private, you wear in public.",
  "The hardest lift of all is lifting your butt off the couch."
];

export const pickRandom = <T>(arr: readonly T[]): T =>
  arr[Math.floor(Math.random() * arr.length)];
