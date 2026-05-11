import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';

/**
 * Catches render errors and DISPLAYS them on screen (instead of crashing to
 * a white screen). Critical for debugging in production builds where
 * adb logcat isn't available.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('Filaha Flock crashed:', error, info);
  }

  reset = () => this.setState({ error: null, info: null });

  render() {
    if (!this.state.error) return this.props.children;

    const { error, info } = this.state;
    return (
      <View style={{
        flex: 1, backgroundColor: '#0a0f1e',
        padding: 20, paddingTop: 60,
      }}>
        <Text style={{
          color: '#ef4444', fontSize: 22, fontWeight: '900', marginBottom: 8,
        }}>
          ⚠ Filaha Flock crashed
        </Text>
        <Text style={{
          color: '#94a3b8', fontSize: 13, marginBottom: 16,
        }}>
          Please screenshot this entire screen and send it to the developer.
        </Text>

        <View style={{
          backgroundColor: '#1a2238', padding: 12, borderRadius: 8, marginBottom: 12,
          borderWidth: 1, borderColor: '#ef4444',
        }}>
          <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800', marginBottom: 4 }}>
            ERROR MESSAGE
          </Text>
          <Text selectable style={{
            color: '#f87171', fontSize: 13, fontWeight: '700',
            fontFamily: 'monospace',
          }}>
            {String(error?.message || error)}
          </Text>
        </View>

        <Text style={{
          color: '#fbbf24', fontSize: 11, fontWeight: '800', marginBottom: 4,
        }}>
          STACK TRACE
        </Text>
        <ScrollView style={{
          flex: 1, backgroundColor: '#11182a', padding: 12, borderRadius: 8,
          borderWidth: 1, borderColor: '#1e2a44',
        }}>
          <Text selectable style={{
            color: '#94a3b8', fontSize: 11, fontFamily: 'monospace',
          }}>
            {String(error?.stack || 'no stack')}
          </Text>
          {info?.componentStack ? (
            <>
              <Text style={{ color: '#fbbf24', fontSize: 11, fontWeight: '800', marginTop: 16, marginBottom: 4 }}>
                COMPONENT STACK
              </Text>
              <Text selectable style={{
                color: '#94a3b8', fontSize: 11, fontFamily: 'monospace',
              }}>
                {info.componentStack}
              </Text>
            </>
          ) : null}
        </ScrollView>

        <Pressable
          onPress={this.reset}
          style={{
            marginTop: 16, padding: 14,
            backgroundColor: '#3b82f6', borderRadius: 10, alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fff', fontWeight: '900', fontSize: 14 }}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }
}
