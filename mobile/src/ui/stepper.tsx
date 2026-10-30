import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from './text';
import { colors, radius, spacing } from './theme';

interface StepperProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
}

/** Quantity picker with minus and plus buttons. */
export function Stepper({ value, onChange, min = 0 }: StepperProps) {
  return (
    <View style={styles.row}>
      <StepButton label="−" accessibilityLabel="Diminuer" disabled={value <= min} onPress={() => onChange(value - 1)} />
      <Text variant="heading" style={styles.value}>
        {value}
      </Text>
      <StepButton label="+" accessibilityLabel="Augmenter" onPress={() => onChange(value + 1)} />
    </View>
  );
}

function StepButton({
  label,
  accessibilityLabel,
  onPress,
  disabled = false,
}: {
  label: string;
  accessibilityLabel: string;
  onPress: () => void;
  disabled?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      hitSlop={6}
      style={({ pressed }) => [styles.button, (pressed || disabled) && { opacity: 0.4 }]}>
      <Text variant="heading">{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  button: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceRaised,
    borderWidth: 1,
    borderColor: colors.border,
  },
  value: {
    minWidth: 24,
    textAlign: 'center',
  },
});
