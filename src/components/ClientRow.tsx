import React from "react";
import { View } from "react-native";
import { ChevronRight, AlertTriangle, Pause, UserCog } from "lucide-react-native";
import { MotiView } from "moti";
import { Pressable } from "./Pressable";
import { Avatar } from "./Avatar";
import { Chip } from "./Chip";
import { Text } from "./Text";
import { Client, ClientStatus } from "@/data/types";
import { timeAgo, genderLabel } from "@/lib/format";
import { colors } from "@/theme/tokens";
import { selectTrainer } from "@/store/data";

type Props = {
  client: Client;
  onPress?: () => void;
  index?: number;
  showTrainer?: boolean;
};

const tagTone = (t: string) => {
  if (t === "Vegetarian") return "success" as const;
  if (t === "Busy Pro") return "info" as const;
  if (t === "Sweet Craving") return "warn" as const;
  return "neutral" as const;
};

const statusTone = (s: ClientStatus) => {
  switch (s) {
    case "Critical":
      return "danger" as const;
    case "On Hold":
      return "warn" as const;
    case "Completed":
      return "neutral" as const;
    default:
      return "lime" as const;
  }
};

export const ClientRow = React.memo(function ClientRow({
  client,
  onPress,
  index = 0,
  showTrainer = false
}: Props) {
  const showStatusChip = client.status !== "Active";
  const trainer = showTrainer ? selectTrainer(client.trainerId) : undefined;

  return (
    <MotiView
      from={{ opacity: 0, translateY: 10 }}
      animate={{ opacity: 1, translateY: 0 }}
      transition={{
        type: "spring",
        damping: 18,
        stiffness: 200,
        // Cap the stagger so long admin lists don't animate in over 1s+.
        delay: 60 + Math.min(index, 8) * 35
      }}
    >
      <Pressable
        onPress={onPress}
        className="flex-row items-center rounded-2xl border border-line bg-surface px-3.5 py-3"
      >
        <Avatar initials={client.initials} size={44} />
        <View className="flex-1 ml-3 mr-2">
          <Text variant="h3" className="text-ink" numberOfLines={1}>
            {client.name}
          </Text>
          <View className="flex-row items-center mt-0.5 flex-wrap">
            <Text variant="caption" className="text-ink-2" tabular>
              {client.age}y · {genderLabel(client.gender)} · {client.weight}kg
            </Text>
            <View className="w-1 h-1 rounded-full bg-ink-4 mx-1.5" />
            <Text variant="caption" className="text-ink-3">
              {timeAgo(client.lastPlanDate)}
            </Text>
          </View>

          {showTrainer ? (
            <View className="flex-row items-center mt-1">
              <UserCog size={10} color={colors.ink3} strokeWidth={2.4} />
              <Text variant="caption" className="text-ink-3 ml-1">
                by{" "}
                <Text
                  variant="caption"
                  className="text-ink-2"
                  style={{ fontFamily: "Inter_600SemiBold" }}
                >
                  {trainer ? trainer.name : "Unassigned"}
                </Text>
              </Text>
            </View>
          ) : null}

          <View className="flex-row flex-wrap mt-2" style={{ gap: 5 }}>
            {showStatusChip ? (
              <Chip
                label={client.status}
                tone={statusTone(client.status)}
                iconLeft={
                  client.status === "Critical" ? (
                    <AlertTriangle
                      size={9}
                      color={colors.danger}
                      strokeWidth={2.6}
                    />
                  ) : client.status === "On Hold" ? (
                    <Pause size={9} color={colors.warn} strokeWidth={2.6} />
                  ) : undefined
                }
              />
            ) : null}
            {client.clientTypes.slice(0, 2).map((t) => (
              <Chip key={t} label={t} tone={tagTone(t)} />
            ))}
          </View>
        </View>
        <ChevronRight size={18} color={colors.ink3} strokeWidth={2} />
      </Pressable>
    </MotiView>
  );
});
