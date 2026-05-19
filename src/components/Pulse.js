import React from 'react';
import { View } from 'react-native';

// Clean & minimal: no pulsing halo. A calm UI never throbs at the user —
// danger is communicated by the card's own color/border/stripe. This stays
// a thin passthrough so callers keep their existing API.
export default function Pulse({ children, style }) {
  return <View style={style}>{children}</View>;
}
