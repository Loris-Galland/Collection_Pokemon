import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';
import Animated, { FadeInDown, FadeOut } from 'react-native-reanimated';

import { Text, colors, radius, spacing } from '@/ui';

import { useWishlist, useWishlistActions } from './wishlist-provider';

const SAVE_ERROR_DURATION_MS = 6000;

/** Tells the user why a change to the wishes was refused, or how many wait for the network. */
export function WishlistNotice() {
  const { t } = useTranslation();
  const { saveError, unsentCount } = useWishlist();
  const { dismissSaveError } = useWishlistActions();

  useEffect(() => {
    if (!saveError) return;
    const timer = setTimeout(dismissSaveError, SAVE_ERROR_DURATION_MS);
    return () => clearTimeout(timer);
  }, [saveError, dismissSaveError]);

  if (saveError) {
    return (
      <Animated.View entering={FadeInDown.springify()} exiting={FadeOut} style={[styles.notice, styles.error]}>
        <Text variant="caption" style={{ color: colors.danger }}>
          {t(`wishlist.saveErrors.${saveError}`)}
        </Text>
      </Animated.View>
    );
  }
  if (unsentCount > 0) {
    return (
      <Animated.View entering={FadeInDown.springify()} exiting={FadeOut} style={styles.notice}>
        <Text variant="caption" tone="muted">
          {t('wishlist.unsent', { count: unsentCount })}
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
