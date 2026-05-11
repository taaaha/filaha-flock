import { useMemo } from 'react';
import { StyleSheet } from 'react-native';
import { useTheme } from './colors';

/**
 * Re-creates a StyleSheet whenever the active theme changes.
 * Pass a factory function so the `colors` proxy is read at the right time.
 *
 * Usage:
 *   const styles = useStyles(() => ({
 *     safe: { backgroundColor: colors.bg },
 *   }));
 */
export function useStyles(factory) {
  const theme = useTheme();
  // Only recompute when theme changes; users should pass a stable factory ref
  // (defined at module scope) to avoid unnecessary rebuilds.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useMemo(() => StyleSheet.create(factory()), [theme]);
}
