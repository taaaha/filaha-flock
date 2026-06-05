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
        flex: 1, backgroundColor: '#1b1714',
        padding: 20, paddingTop: 60,
      }}>
        <Text style={{
          color: '#e0654a', fontSize: 22, fontWeight: '800', marginBottom: 8,
        }}>
          ⚠ Filaha Flock crashed
        </Text>
        <Text style={{
          color: '#b6ab98', fontSize: 13, marginBottom: 16,
        }}>
          Please screenshot this entire screen and send it to the developer.
        </Text>

        <View style={{
          backgroundColor: '#272019', padding: 12, borderRadius: 10, marginBottom: 12,
          borderWidth: 1, borderColor: '#e0654a',
        }}>
          <Text style={{ color: '#e0a44e', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4 }}>
            ERROR MESSAGE
          </Text>
          <Text selectable style={{
            color: '#ec8266', fontSize: 13, fontWeight: '600',
            fontFamily: 'monospace',
          }}>
            {String(error?.message || error)}
          </Text>
        </View>

        <Text style={{
          color: '#e0a44e', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginBottom: 4,
        }}>
          STACK TRACE
        </Text>
        <ScrollView style={{
          flex: 1, backgroundColor: '#241f19', padding: 12, borderRadius: 10,
          borderWidth: 1, borderColor: '#3a3228',
        }}>
          <Text selectable style={{
            color: '#b6ab98', fontSize: 11, fontFamily: 'monospace',
          }}>
            {String(error?.stack || 'no stack')}
          </Text>
          {info?.componentStack ? (
            <>
              <Text style={{ color: '#e0a44e', fontSize: 11, fontWeight: '700', letterSpacing: 1, marginTop: 16, marginBottom: 4 }}>
                COMPONENT STACK
              </Text>
              <Text selectable style={{
                color: '#b6ab98', fontSize: 11, fontFamily: 'monospace',
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
            backgroundColor: '#5fb874', borderRadius: 12, alignItems: 'center',
          }}
        >
          <Text style={{ color: '#1b1714', fontWeight: '800', fontSize: 14 }}>
            Try again
          </Text>
        </Pressable>
      </View>
    );
  }
}
