import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography } from './theme';

type Variant = keyof typeof typography;
type Tone = 'default' | 'muted' | 'faint' | 'accent' | 'danger';

const toneColors: Record<Tone, string> = {
  default: colors.text,
  muted: colors.textMuted,
  faint: colors.textFaint,
  accent: colors.accent,
  danger: colors.danger,
};

export interface TextProps extends RNTextProps {
  variant?: Variant;
  tone?: Tone;
}

/** Base text of the app, with the typography styles of the theme. */
export function Text({ variant = 'body', tone = 'default', style, ...rest }: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        { color: toneColors[tone] },
        variant === 'overline' && { textTransform: 'uppercase' },
        style,
      ]}
      {...rest}
    />
  );
}
