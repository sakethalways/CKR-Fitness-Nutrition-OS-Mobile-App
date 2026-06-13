import React from "react";
import { View, Text, ScrollView, Pressable } from "react-native";

type Props = { children: React.ReactNode };
type State = { error: Error | null };

/**
 * Catches any render-time JS error in the subtree and shows a calm, friendly
 * screen instead of letting React Native go blank.
 *
 * In development we also show the raw message + stack (to debug fast). In a
 * production build (`__DEV__ === false`) the technical details are hidden — the
 * user only sees a reassuring message and a "Try again" button.
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

  reset = () => this.setState({ error: null });

  render() {
    if (this.state.error) {
      const e = this.state.error;
      return (
        <View
          style={{
            flex: 1,
            backgroundColor: "#0A0B0D",
            padding: 24,
            paddingTop: 80,
            alignItems: "center"
          }}
        >
          <Text
            style={{
              color: "#FFFFFF",
              fontSize: 22,
              fontWeight: "700",
              marginBottom: 10,
              textAlign: "center"
            }}
          >
            Something went wrong
          </Text>
          <Text
            style={{
              color: "#94A3B8",
              marginBottom: 28,
              fontSize: 14,
              textAlign: "center",
              lineHeight: 20
            }}
          >
            The app hit an unexpected problem. You can try again — your data is
            safe.
          </Text>

          <Pressable
            onPress={this.reset}
            style={{
              backgroundColor: "#FE7F0B",
              paddingHorizontal: 28,
              paddingVertical: 14,
              borderRadius: 14
            }}
          >
            <Text
              style={{ color: "#0A0B0D", fontWeight: "700", fontSize: 15 }}
            >
              Try again
            </Text>
          </Pressable>

          {/* Technical details — DEV builds only. Never shown in production. */}
          {__DEV__ ? (
            <ScrollView
              style={{
                marginTop: 28,
                alignSelf: "stretch",
                backgroundColor: "#14161B",
                borderColor: "rgba(255,255,255,0.1)",
                borderWidth: 1,
                borderRadius: 12,
                padding: 12
              }}
            >
              <Text
                style={{
                  color: "#F87171",
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
          ) : null}
        </View>
      );
    }
    return this.props.children as any;
  }
}
