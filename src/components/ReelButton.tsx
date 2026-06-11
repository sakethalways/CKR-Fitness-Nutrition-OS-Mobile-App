import React from "react";
import { Instagram } from "lucide-react-native";
import { Text } from "./Text";
import { Pressable } from "./Pressable";
import { hasReel, openReel } from "@/lib/reels";

type Props = {
  url: string | null | undefined;
  /** Compact pill (icon only) vs full label. Defaults to full. */
  compact?: boolean;
};

/**
 * Tappable "Reel" pill that opens the dish's Instagram recipe video.
 * Renders nothing when there's no link, so callers can drop it in freely.
 */
export function ReelButton({ url, compact = false }: Props) {
  if (!hasReel(url)) return null;
  return (
    <Pressable
      onPress={() => openReel(url)}
      haptic="light"
      scaleTo={0.96}
      className="flex-row items-center self-start px-2.5 h-8 rounded-full border border-line bg-white/[0.04]"
    >
      <Instagram size={13} color="#E1306C" strokeWidth={2.2} />
      {compact ? null : (
        <Text
          variant="caption"
          className="text-ink-2 ml-1.5"
          style={{ fontFamily: "Inter_600SemiBold" }}
        >
          Reel
        </Text>
      )}
    </Pressable>
  );
}
