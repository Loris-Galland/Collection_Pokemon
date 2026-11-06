import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { CheckIcon, ChevronIcon } from './icons';
import { Sheet } from './sheet';
import { Text } from './text';
import { colors, radius, spacing } from './theme';

export interface SelectOption<T extends string> {
  value: T;
  label: string;
  /** A second line, for example the name of a language written in that language. */
  detail?: string;
}

interface SelectFieldProps<T extends string> {
  label: string;
  value: T;
  options: readonly SelectOption<T>[];
  onChange: (value: T) => void;
  /** A short line under the title of the list. */
  hint?: string;
}

/** A field showing the chosen option. Touching it opens the whole list in a sheet, and choosing closes it. */
export function SelectField<T extends string>({ label, value, options, onChange, hint }: SelectFieldProps<T>) {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}, ${selected?.label ?? ''}`}
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.field, pressed && styles.pressed]}>
        <View style={styles.fieldText}>
          <Text variant="overline" tone="muted">
            {label}
          </Text>
          <Text numberOfLines={1}>{selected?.label}</Text>
        </View>
        <ChevronIcon color={colors.textMuted} />
      </Pressable>

      <Sheet visible={open} onClose={() => setOpen(false)} title={label} subtitle={hint}>
        <View accessibilityRole="radiogroup" style={styles.list}>
          {options.map((option, index) => {
            const checked = option.value === value;
            return (
              <Pressable
                key={option.value}
                accessibilityRole="radio"
                accessibilityState={{ checked }}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  index > 0 && styles.separator,
                  checked && styles.checked,
                  pressed && styles.pressed,
                ]}>
                <View style={styles.optionText}>
                  <Text style={checked ? styles.checkedLabel : undefined}>{option.label}</Text>
                  {option.detail && option.detail !== option.label && (
                    <Text variant="caption" tone="faint">
                      {option.detail}
                    </Text>
                  )}
                </View>
                {checked && <CheckIcon color={colors.accent} />}
              </Pressable>
            );
          })}
        </View>
      </Sheet>
    </>
  );
}

const styles = StyleSheet.create({
  field: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
  fieldText: {
    flex: 1,
    gap: 2,
  },
  list: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceRaised,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    minHeight: 52,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  separator: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  checked: {
    backgroundColor: 'rgba(255, 210, 63, 0.08)',
  },
  checkedLabel: {
    color: colors.accent,
    fontWeight: '600',
  },
  optionText: {
    flex: 1,
    gap: 1,
  },
  pressed: {
    opacity: 0.7,
  },
});
