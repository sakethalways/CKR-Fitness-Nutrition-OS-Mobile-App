import React, { useEffect, useRef, useState } from "react";
import { Text, TextStyle } from "react-native";

type Props = {
  value: number;
  decimals?: number;
  duration?: number;
  prefix?: string;
  suffix?: string;
  style?: TextStyle | TextStyle[];
};

/**
 * Count-up number display, animated on the JS side with requestAnimationFrame.
 *
 * The previous implementation animated a TextInput's native `text` prop via
 * reanimated — a pattern that is unreliable on the New Architecture (Fabric):
 * after the first animation the display could silently stop updating, which
 * made +/- steppers LOOK dead in release builds. Plain state-driven <Text>
 * works identically on every architecture, and animating from the previous
 * value (not from 0) also reads better for small adjustments.
 */
export function AnimatedNumber({
  value,
  decimals = 0,
  duration = 500,
  prefix = "",
  suffix = "",
  style
}: Props) {
  const [display, setDisplay] = useState(value);
  const fromRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const from = fromRef.current;
    if (!Number.isFinite(value)) return;
    if (from === value) {
      setDisplay(value);
      return;
    }
    const start = Date.now();
    const tick = () => {
      const t = Math.min(1, (Date.now() - start) / Math.max(1, duration));
      const eased = 1 - Math.pow(1 - t, 3); // cubic ease-out
      setDisplay(from + (value - from) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = value;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
      // Land on the final value so an interrupted animation never lies.
      fromRef.current = value;
    };
  }, [value, duration]);

  const formatted =
    decimals > 0 ? display.toFixed(decimals) : Math.round(display).toString();

  return (
    <Text
      style={[
        {
          padding: 0,
          margin: 0,
          color: "#FFFFFF",
          fontFamily: "Inter_700Bold",
          fontVariant: ["tabular-nums"]
        },
        style as any
      ]}
    >
      {`${prefix}${formatted}${suffix}`}
    </Text>
  );
}
