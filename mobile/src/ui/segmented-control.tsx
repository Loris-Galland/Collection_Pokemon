import type { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import type { IconProps } from './icons';
import { Text } from './text';
import { colors, radius, spacing } from './theme';

interface SegmentedControlProps<Value extends string> {
  options: readonly { value: Value; label: string; accessibilityLabel?: string; icon?: ComponentType<IconProps> }[];
  value: Value;
  onChange: (value: Value) => void;
  /** Smaller, for a control repeated on many lines. */
  compact?: boolean;
}

/** Full width switch between a few modes of a screen, with the current one in yellow. */
export function SegmentedControl<Value extends string>({
  options,
  value,
  onChange,
  compact = false,
}: SegmentedControlProps<Value>) {
  return (
    <View accessibilityRole="tablist" style={styles.control}>
      {options.map((option) => {
        const selected = option.value === value;
        const color = selected ? colors.accentText : colors.text;
        const Icon = option.icon;
        return (
          <Pressable
            key={option.value}
            accessibilityRole="tab"
            accessibilityLabel={option.accessibilityLabel}
            accessibilityState={{ selected }}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              compact && styles.compactSegment,
              selected && styles.selected,
              pressed && styles.pressed,
            ]}>
            {Icon && <Icon color={color} size={16} />}
            <Text numberOfLines={1} variant={compact ? 'caption' : 'body'} style={{ color, fontWeight: '600' }}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  control: {
    flexDirection: 'row',
    gap: spacing.xs,
    padding: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  segment: {
    flex: 1,
    flexDirection: 'row',
    gap: spacing.xs + 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: radius.sm,
  },
  compactSegment: {
    paddingVertical: spacing.sm,
  },
  selected: {
    backgroundColor: colors.accent,
  },
  pressed: {
    opacity: 0.7,
  },
});
