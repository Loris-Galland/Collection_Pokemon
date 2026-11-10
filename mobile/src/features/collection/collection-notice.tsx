import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Text, colors, radius, spacing } from '@/ui';

import { useCollectionSaveError, useCollectionStatus } from './collection-provider';
import type { SaveFailure } from './collection-source';

const SAVE_ERROR_DURATION_MS = 6000;

const SAVE_ERROR_MESSAGES = {
  offline: 'collection.saveOffline',
  full: 'collection.saveFull',
  'signed-out': 'collection.saveSignedOut',
  other: 'collection.saveFailed',
} as const satisfies Record<SaveFailure, string>;

/** Tells the user why the collection cannot be changed, or why the last change was undone. */
export function CollectionNotice() {
  const { t } = useTranslation();
  const readOnly = useCollectionStatus() === 'read-only';
  const { saveError, dismiss } = useCollectionSaveError();

  useEffect(() => {
    if (!saveError) return;
    const timer = setTimeout(dismiss, SAVE_ERROR_DURATION_MS);
    return () => clearTimeout(timer);
  }, [saveError, dismiss]);

  if (saveError) {
    return (
      <Animated.View entering={FadeInDown.springify()} exiting={FadeOut} style={[styles.notice, styles.error]}>
        <Text variant="caption" style={{ color: colors.danger }}>
          {t(SAVE_ERROR_MESSAGES[saveError])}
        </Text>
      </Animated.View>
    );
  }
  if (readOnly) {
    return (
      <Animated.View entering={FadeInDown.springify()} style={styles.notice}>
        <Text variant="caption" tone="muted">
          {t('collection.readOnly')}
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
