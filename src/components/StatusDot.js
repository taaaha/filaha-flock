import React from 'react';
import { View } from 'react-native';
import { statusColor } from '../utils/colors';

export default function StatusDot({ status, size = 10 }) {
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        backgroundColor: statusColor(status),
      }}
    />
  );
}
