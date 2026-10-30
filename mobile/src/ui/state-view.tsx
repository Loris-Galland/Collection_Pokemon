import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button } from './button';
import { Text } from './text';
import { colors, spacing } from './theme';

/** Centered loading, error or empty state. */
export function StateView({
  loading = false,
  title,
  message,
  actionLabel,
  onAction,
}: {
  loading?: boolean;
  title?: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator color={colors.accent} size="large" />}
      {title && (
        <Text variant="heading" style={styles.center}>
          {title}
        </Text>
      )}
      {message && (
        <Text tone="muted" style={styles.center}>
          {message}
        </Text>
      )}
      {actionLabel && onAction && (
        <View style={styles.action}>
          <Button label={actionLabel} variant="secondary" onPress={onAction} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.xl,
    backgroundColor: colors.background,
  },
  center: {
    textAlign: 'center',
  },
  action: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
