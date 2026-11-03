import { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Text, colors, radius, spacing } from '@/ui';

import { useCollectionSaveError, useCollectionStatus } from './collection-provider';

const SAVE_ERROR_DURATION_MS = 6000;

/** Tells the user why the collection cannot be changed, or that the last change was undone. */
export function CollectionNotice() {
  const readOnly = useCollectionStatus() === 'read-only';
  const { saveFailed, dismiss } = useCollectionSaveError();

  useEffect(() => {
    if (!saveFailed) return;
    const timer = setTimeout(dismiss, SAVE_ERROR_DURATION_MS);
    return () => clearTimeout(timer);
  }, [saveFailed, dismiss]);

  if (saveFailed) {
    return (
      <Animated.View entering={FadeInDown.springify()} exiting={FadeOut} style={[styles.notice, styles.error]}>
        <Text variant="caption" style={{ color: colors.danger }}>
          Ta modification n’a pas pu être enregistrée. Réessaie dans un instant.
        </Text>
      </Animated.View>
    );
  }
  if (readOnly) {
    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.notice}>
        <Text variant="caption" tone="muted">
          Hors connexion, ta collection est en consultation seule. Reconnecte-toi pour la modifier.
        </Text>
      </Animated.View>
    );
  }
  return null;
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
