import React, { useState } from "react";
import { View } from "react-native";
import { Text } from "./Text";
import { Pressable } from "./Pressable";

type Props = {
  text: string;
  /** truncate threshold in characters */
  threshold?: number;
  className?: string;
};

export function ReadMore({ text, threshold = 160, className = "text-ink" }: Props) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > threshold;
  const display =
    !isLong || expanded ? text : text.slice(0, threshold).trimEnd() + "…";

  return (
    <View>
      <Text variant="body" className={`${className} leading-6`}>
        {display}
      </Text>
      {isLong ? (
        <Pressable
          onPress={() => setExpanded((v) => !v)}
          haptic="light"
          scaleTo={0.97}
          className="self-start mt-1.5"
        >
          <Text
            variant="caption"
            className="text-lime"
            style={{ fontFamily: "Inter_600SemiBold" }}
          >
            {expanded ? "Read less" : "Read more"}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}
