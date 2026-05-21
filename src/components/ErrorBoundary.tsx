import React from "react";
import { View, Text, ScrollView } from "react-native";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Catches any render-time JS error in the subtree and displays the message
 * on a visible screen instead of letting RN go blank.
 */
export class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: any) {
    // eslint-disable-next-line no-console
    console.error("[ErrorBoundary]", error, info?.componentStack);
  }

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#0A0B0D",
            padding: 24,
            paddingTop: 60
          }}
        >
          <Text
            style={{
              color: "#F87171",
              fontSize: 20,
              fontWeight: "700",
              marginBottom: 12
            }}
          >
            App crashed
          </Text>
          <Text style={{ color: "#94A3B8", marginBottom: 16, fontSize: 13 }}>
            Send the message + stack below — they'll tell us exactly which file
            is broken.
          </Text>
          <ScrollView
            style={{
              backgroundColor: "#14161B",
              borderColor: "rgba(255,255,255,0.1)",
              borderWidth: 1,
              borderRadius: 12,
              padding: 12
            }}
          >
            <Text
              style={{
                color: "#FFFFFF",
                fontFamily: "monospace",
                fontSize: 12,
                marginBottom: 12
              }}
            >
              {e.message}
            </Text>
            {e.stack ? (
              <Text
                style={{
                  color: "#64748B",
                  fontFamily: "monospace",
                  fontSize: 10
                }}
              >
                {e.stack}
              </Text>
            ) : null}
          </ScrollView>
        </View>
      );
    }
    return this.props.children as any;
  }
}
