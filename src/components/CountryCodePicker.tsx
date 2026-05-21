import React, { useMemo, useState } from "react";
import { View, ScrollView } from "react-native";
import { ChevronDown, Search } from "lucide-react-native";
import { Pressable } from "./Pressable";
import { Text } from "./Text";
import { Sheet } from "./Sheet";
import { Input } from "./Input";
import { COUNTRY_CODES, CountryCode } from "@/data/countryCodes";
import { colors } from "@/theme/tokens";

type Props = {
  value: string; // dial code, e.g. "+91"
  onChange: (code: string) => void;
};

export function CountryCodePicker({ value, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered: CountryCode[] = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return COUNTRY_CODES;
    return COUNTRY_CODES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.includes(q) ||
        c.country.toLowerCase().includes(q)
    );
  }, [search]);

  const current = COUNTRY_CODES.find((c) => c.code === value);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        haptic="light"
        scaleTo={0.97}
        className="flex-row items-center rounded-xl border border-line-strong bg-surface h-12 px-3"
        style={{ minWidth: 92 }}
      >
        <Text style={{ fontSize: 17, marginRight: 6 }}>
          {current?.flag ?? "🌐"}
        </Text>
        <Text
          variant="bodyMedium"
          className="text-ink"
          style={{ fontFamily: "Inter_600SemiBold", fontVariant: ["tabular-nums"] }}
        >
          {value}
        </Text>
        <ChevronDown
          size={14}
          color={colors.ink3}
          strokeWidth={2.2}
          style={{ marginLeft: 4 }}
        />
      </Pressable>

      <Sheet
        visible={open}
        onClose={() => setOpen(false)}
        title="Country code"
        subtitle="Used to redirect WhatsApp messages to this client."
        compact={false}
      >
        <Input
          placeholder="Search by name or code…"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          iconLeft={<Search size={16} color={colors.ink3} strokeWidth={2.2} />}
        />
        <ScrollView
          style={{ maxHeight: 360, marginTop: 10 }}
          showsVerticalScrollIndicator={false}
        >
          <View style={{ gap: 6, paddingBottom: 16 }}>
            {filtered.length === 0 ? (
              <Text variant="body" className="text-ink-3 text-center mt-4">
                No matches.
              </Text>
            ) : (
              filtered.map((c, i) => {
                const active = c.code === value && c.country === current?.country;
                return (
                  <Pressable
                    key={`${c.country}-${c.code}-${i}`}
                    onPress={() => {
                      onChange(c.code);
                      setOpen(false);
                      setSearch("");
                    }}
                    haptic="light"
                    scaleTo={0.98}
                    className={`flex-row items-center rounded-2xl border px-3.5 py-2.5 ${
                      active
                        ? "border-lime/40 bg-lime/[0.06]"
                        : "border-line bg-surface"
                    }`}
                  >
                    <Text style={{ fontSize: 18, marginRight: 10 }}>{c.flag}</Text>
                    <View className="flex-1">
                      <Text
                        variant="bodyMedium"
                        className="text-ink"
                        style={{ fontFamily: "Inter_500Medium" }}
                      >
                        {c.name}
                      </Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      className={active ? "text-lime" : "text-ink-2"}
                      tabular
                      style={{ fontFamily: "Inter_600SemiBold" }}
                    >
                      {c.code}
                    </Text>
                  </Pressable>
                );
              })
            )}
          </View>
        </ScrollView>
      </Sheet>
    </>
  );
}
