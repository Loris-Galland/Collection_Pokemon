import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Text } from './text';
import { colors, radius, spacing } from './theme';

const ERROR_DURATION_MS = 6000;

interface SyncNoticeProps {
  /** Why the last change was refused. It shows for a few seconds, then `onDismiss` clears it. */
  error: string | undefined;
  /** How many changes wait for the network, already worded. */
  pending: string | undefined;
  onDismiss: () => void;
}

/** Says why a change was refused, or else that some changes wait for the network. */
export function SyncNotice({ error, pending, onDismiss }: SyncNoticeProps) {
  useEffect(() => {
    if (!error) return;
    const timer = setTimeout(onDismiss, ERROR_DURATION_MS);
    return () => clearTimeout(timer);
  }, [error, onDismiss]);

  const message = error ?? pending;
  if (!message) return null;
  return (
    <Animated.View entering={FadeInDown.springify()} exiting={FadeOut} style={[styles.notice, error && styles.error]}>
      <Text variant="caption" tone={error ? undefined : 'muted'} style={error ? { color: colors.danger } : undefined}>
        {message}
      </Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  notice: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  error: {
    borderColor: colors.danger,
  },
});
