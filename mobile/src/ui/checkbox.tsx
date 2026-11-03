import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './text';
import { colors, radius, spacing } from './theme';

interface CheckboxProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}

/** Box to tick, with its label beside it. */
export function Checkbox({ label, checked, onChange }: CheckboxProps) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
      accessibilityLabel={label}
      hitSlop={6}
      onPress={() => onChange(!checked)}
      style={styles.row}>
      <View style={[styles.box, checked && styles.checked]}>
        {checked && (
          <Text variant="caption" style={{ color: colors.accentText }}>
            ✓
          </Text>
        )}
      </View>
      <Text variant="caption" tone="muted" style={styles.label}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  box: {
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  checked: {
    borderColor: colors.accent,
    backgroundColor: colors.accent,
  },
  label: {
    flex: 1,
  },
});
