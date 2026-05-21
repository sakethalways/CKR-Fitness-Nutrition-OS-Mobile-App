/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        bg: "#0A0B0D",
        surface: "#14161B",
        elevated: "#1C1F26",
        sunken: "#070809",
        lime: {
          DEFAULT: "#C6F432",
          dim: "#9FCC1A",
          glow: "#D8FF5C"
        },
        ink: {
          DEFAULT: "#FFFFFF",
          2: "#94A3B8",
          3: "#64748B",
          4: "#475569"
        },
        line: {
          DEFAULT: "rgba(255,255,255,0.08)",
          strong: "rgba(255,255,255,0.14)"
        },
        success: "#34D399",
        warn: "#FBBF24",
        danger: "#F87171",
        info: "#60A5FA"
      },
      fontFamily: {
        sans: ["Inter_400Regular"],
        medium: ["Inter_500Medium"],
        semibold: ["Inter_600SemiBold"],
        bold: ["Inter_700Bold"]
      },
      borderRadius: {
        xl2: "20px"
      }
    }
  },
  plugins: []
};
