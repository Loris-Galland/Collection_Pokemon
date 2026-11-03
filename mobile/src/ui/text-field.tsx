import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { useRevealField } from './keyboard-scroll-view';
import { Text } from './text';
import { colors, radius, spacing, typography } from './theme';

/** Text input with its label above it. */
export function TextField({ label, style, onFocus, onBlur, ...rest }: TextInputProps & { label: string }) {
  const [focused, setFocused] = useState(false);
  const revealField = useRevealField();
  return (
    <View style={styles.field}>
      <Text variant="overline" tone="muted">
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        placeholderTextColor={colors.textFaint}
        selectionColor={colors.accent}
        autoCapitalize="none"
        autoCorrect={false}
        onFocus={(event) => {
          setFocused(true);
          revealField?.();
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
        style={[styles.input, focused && styles.focused, style]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.sm,
  },
  input: {
    ...typography.body,
    color: colors.text,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  focused: {
    borderColor: colors.accent,
  },
});
