import React, { useState } from 'react';
import { Pressable } from 'react-native';
import { colors } from '../utils/colors';
import { useStyles } from '../utils/useStyles';
import Icon from './Icon';
import HelpModal from './HelpModal';

/**
 * Drop-in `?` button. Wires up its own modal — caller just passes `t` and the
 * `screen` key (e.g. "dashboard", "guide", "settings", "alerts", "coopDetail").
 */
export default function HelpButton({ t, screen, style, size = 32 }) {
  const styles = useStyles(makeStyles);
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        onPress={() => setOpen(true)}
        hitSlop={10}
        android_ripple={{ color: colors.accent + '33', borderless: true, radius: 22 }}
        style={[styles.btn, { width: size, height: size, borderRadius: size / 2 }, style]}
      >
        <Icon name="info" size={Math.round(size * 0.6)} color={colors.textSecondary} />
      </Pressable>
      <HelpModal visible={open} onClose={() => setOpen(false)} t={t} screen={screen} />
    </>
  );
}

const makeStyles = () => ({
  btn: {
    backgroundColor: colors.bgElevated,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
