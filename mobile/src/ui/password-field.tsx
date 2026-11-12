import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type TextInputProps } from 'react-native';

import { EyeIcon, EyeOffIcon } from './icons';
import { TextField } from './text-field';
import { colors, spacing } from './theme';

const ICON_SIZE = 20;
const BUTTON_SIZE = 44;

/** Password input with an eye button that shows or hides what was typed. */
export function PasswordField(props: Omit<TextInputProps, 'secureTextEntry'> & { label: string }) {
  const { t } = useTranslation();
  const [visible, setVisible] = useState(false);
  const Icon = visible ? EyeOffIcon : EyeIcon;
  return (
    <View>
      <TextField
        {...props}
        secureTextEntry={!visible}
        // Hidden again once the field is left, so a password shown for a moment does not stay on screen.
        onBlur={(event) => {
          setVisible(false);
          props.onBlur?.(event);
        }}
        style={styles.input}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={visible ? t('common.hidePassword') : t('common.showPassword')}
        onPress={() => setVisible((value) => !value)}
        hitSlop={4}
        style={({ pressed }) => [styles.toggle, pressed && styles.pressed]}
      >
        <Icon color={colors.textMuted} size={ICON_SIZE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  input: {
    paddingRight: BUTTON_SIZE + spacing.xs,
  },
  // Placed over the right end of the input, which is the last element of the field.
  toggle: {
    position: 'absolute',
    right: spacing.xs,
    // The input is about 47 high, so this centers the button on it.
    bottom: 2,
    width: BUTTON_SIZE,
    height: BUTTON_SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});
