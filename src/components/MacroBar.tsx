import React from "react";
import { View } from "react-native";
import { MotiView } from "moti";
import { Text } from "./Text";

type Props = {
  protein: number; // g
  carbs: number; // g
  fat: number; // g
};

export function MacroBar({ protein, carbs, fat }: Props) {
  const pKcal = protein * 4;
  const cKcal = carbs * 4;
  const fKcal = fat * 9;
  const total = pKcal + cKcal + fKcal || 1;
  const pPct = (pKcal / total) * 100;
  const cPct = (cKcal / total) * 100;
  const fPct = (fKcal / total) * 100;

  return (
    <View>
      <View
        style={{ height: 10, borderRadius: 6, overflow: "hidden" }}
        className="flex-row bg-white/[0.04]"
      >
        <MotiView
          animate={{ width: `${pPct}%` as any }}
          transition={{ type: "spring", damping: 18, stiffness: 160 }}
          style={{ height: "100%", backgroundColor: "#60A5FA" }}
        />
        <MotiView
          animate={{ width: `${cPct}%` as any }}
          transition={{ type: "spring", damping: 18, stiffness: 160 }}
          style={{ height: "100%", backgroundColor: "#FE7F0B" }}
        />
        <MotiView
          animate={{ width: `${fPct}%` as any }}
          transition={{ type: "spring", damping: 18, stiffness: 160 }}
          style={{ height: "100%", backgroundColor: "#FBBF24" }}
        />
      </View>
      <View className="flex-row justify-between mt-3">
        <Legend color="#60A5FA" label="Protein" value={`${protein}g`} pct={pPct} />
        <Legend color="#FE7F0B" label="Carbs" value={`${carbs}g`} pct={cPct} />
        <Legend color="#FBBF24" label="Fat" value={`${fat}g`} pct={fPct} />
      </View>
    </View>
  );
}

function Legend({
  color,
  label,
  value,
  pct
}: {
  color: string;
  label: string;
  value: string;
  pct: number;
}) {
  return (
    <View className="flex-row items-center">
      <View
        style={{
          width: 8,
          height: 8,
          borderRadius: 4,
          backgroundColor: color,
          marginRight: 6
        }}
      />
      <View>
        <Text variant="caption" className="text-ink-3">
          {label}
        </Text>
        <Text
          variant="caption"
          className="text-ink"
          tabular
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          {value} · {Math.round(pct)}%
        </Text>
      </View>
    </View>
  );
}
