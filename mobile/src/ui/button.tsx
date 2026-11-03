import type { ComponentType } from 'react';
import { Pressable, StyleSheet } from 'react-native';

import type { IconProps } from './icons';
import { Text } from './text';
import { colors, radius, spacing } from './theme';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  icon?: ComponentType<IconProps>;
}

/** Primary button in yellow, or a discreet secondary one. */
export function Button({ label, onPress, variant = 'primary', disabled = false, icon: Icon }: ButtonProps) {
  const primary = variant === 'primary';
  const color = primary ? colors.accentText : colors.text;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        (pressed || disabled) && styles.dimmed,
      ]}>
      {Icon && <Icon color={color} />}
      <Text variant="heading" style={{ color }}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    gap: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md + 2,
    borderRadius: radius.md,
  },
  primary: {
    backgroundColor: colors.accent,
  },
  secondary: {
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dimmed: {
    opacity: 0.6,
  },
});
