import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';
import CoopMascot from './CoopMascot';

/**
 * Catches render errors and shows a calm, branded recovery screen instead of
 * a crash. Technical details stay hidden behind a small toggle so farmers
 * never face a wall of red developer text.
 */
export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, showDetails: false };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // eslint-disable-next-line no-console
    console.error('Filaha Flock crashed:', error, info);
  }

  reset = () => this.setState({ error: null, info: null, showDetails: false });

  render() {
    if (!this.state.error) return this.props.children;

    const { error, info, showDetails } = this.state;
    return (
      <View style={{ flex: 1, backgroundColor: '#faf7f0', padding: 24, paddingTop: 90 }}>
        <View style={{ alignItems: 'center', marginBottom: 26 }}>
          <View style={{
            width: 110, height: 110, borderRadius: 36, backgroundColor: '#fffefb',
            alignItems: 'center', justifyContent: 'center',
            borderWidth: 1, borderColor: '#eadfcd',
          }}>
            <CoopMascot status="warn" size={78} />
          </View>
        </View>

        {/* Trilingual so it's understood no matter the language state */}
        <Text style={{ color: '#2a2420', fontSize: 21, fontWeight: '800', textAlign: 'center' }}>
          حدث خطأ ما
        </Text>
        <Text style={{ color: '#6e6455', fontSize: 14, textAlign: 'center', marginTop: 6 }}>
          Une erreur est survenue · Something went wrong
        </Text>
        <Text style={{ color: '#6e6455', fontSize: 13.5, textAlign: 'center', marginTop: 12, lineHeight: 20 }}>
          اضغط على الزر للمحاولة من جديد — بياناتك محفوظة.
        </Text>

        <Pressable
          onPress={this.reset}
          android_ripple={{ color: '#ffffff44' }}
          style={{
            marginTop: 24, paddingVertical: 15, borderRadius: 16,
            backgroundColor: '#3f7d4f', alignItems: 'center',
          }}
        >
          <Text style={{ color: '#fffdf7', fontWeight: '800', fontSize: 15 }}>
            إعادة المحاولة · Réessayer
          </Text>
        </Pressable>

        <Pressable onPress={() => this.setState({ showDetails: !showDetails })} hitSlop={8}
          style={{ marginTop: 18, alignItems: 'center' }}>
          <Text style={{ color: '#a39682', fontSize: 12.5, fontWeight: '600' }}>
            {showDetails ? '▲' : '▼'}  التفاصيل التقنية · Détails techniques
          </Text>
        </Pressable>

        {showDetails ? (
          <ScrollView style={{
            marginTop: 10, maxHeight: 220, backgroundColor: '#fffefb',
            borderRadius: 12, borderWidth: 1, borderColor: '#eadfcd', padding: 12,
          }}>
            <Text selectable style={{ color: '#c0533a', fontSize: 12, fontWeight: '700', fontFamily: 'monospace' }}>
              {String(error?.message || error)}
            </Text>
            <Text selectable style={{ color: '#8a7d69', fontSize: 10.5, fontFamily: 'monospace', marginTop: 8 }}>
              {String(error?.stack || '')}
            </Text>
            {info?.componentStack ? (
              <Text selectable style={{ color: '#8a7d69', fontSize: 10.5, fontFamily: 'monospace', marginTop: 8 }}>
                {info.componentStack}
              </Text>
            ) : null}
          </ScrollView>
        ) : null}
      </View>
    );
  }
}
