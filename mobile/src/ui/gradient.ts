import { Platform, type ViewStyle } from 'react-native';

/**
 * Background gradient from a CSS `linear-gradient(...)`, with no dependency. React Native supports it natively through
 * `experimental_backgroundImage`, and the web through `backgroundImage`.
 */
export function gradientStyle(css: string): ViewStyle {
  return (Platform.OS === 'web' ? { backgroundImage: css } : { experimental_backgroundImage: css }) as ViewStyle;
}
