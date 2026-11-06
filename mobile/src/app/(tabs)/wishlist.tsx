import { wishesOf } from '@collection/shared';
import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useRequireAccount } from '@/features/account/use-account';
import { WishlistNameSheet } from '@/features/wishlist/wishlist-name-sheet';
import { useWishlist, useWishlistActions } from '@/features/wishlist/wishlist-provider';
import { NewWishlistTile, WishlistTile } from '@/features/wishlist/wishlist-tile';
import { useWishCards } from '@/features/wishlist/use-wish-cards';
import { formatEuros } from '@/lib/format';
import {
  Button,
  HeartIcon,
  MAX_CONTENT_WIDTH,
  Text,
  colors,
  gradientStyle,
  radius,
  spacing,
  useColumns,
  WEB_TAB_BAR_OFFSET,
} from '@/ui';

const GAP = spacing.md;

/** Wishes screen with what all the wishes would cost and the lists they are sorted in. */
export default function WishlistScreen() {
  const { t } = useTranslation();
  const { wishlists, wishes } = useWishlist();
  const { createWishlist } = useWishlistActions();
  const requireAccount = useRequireAccount();
  const { cards, loading, costOf } = useWishCards(wishes);
  const columns = useColumns(170, 5);
  const [creating, setCreating] = useState(false);

  const cost = useMemo(() => costOf(wishes), [costOf, wishes]);

  const lists = useMemo(
    () =>
      wishlists.map((wishlist) => {
        const listWishes = wishesOf({ wishes }, wishlist.id);
        return {
          wishlist,
          count: listWishes.length,
          imageUrls: listWishes.slice(0, 4).map((wish) => cards.get(wish.cardId)?.card.imageUrl),
          cost: loading ? undefined : costOf(listWishes).amount,
        };
      }),
    [wishlists, wishes, cards, loading, costOf],
  );

  const empty = wishlists.length === 0;
  const cellStyle = [styles.cell, { width: `${100 / columns}%` as const }];

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.titleBlock}>
          <Text variant="overline" style={{ color: colors.wish }}>
            {t('common.cards', { count: wishes.length })} · {t('wishlist.lists', { count: wishlists.length })}
          </Text>
          <Text variant="display">{t('wishlist.title')}</Text>
        </Animated.View>

        {empty ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.empty}>
            <View style={styles.emptyHeart}>
              <HeartIcon color={colors.wish} size={44} />
            </View>
            <Text variant="heading" style={styles.centered}>
              {t('wishlist.emptyTitle')}
            </Text>
            <Text tone="muted" style={styles.centered}>
              {t('wishlist.emptyText')}
            </Text>
            <View style={styles.emptyActions}>
              <Button label={t('wishlist.findCard')} onPress={() => router.navigate('/')} />
              <Button
                label={t('wishlist.newList')}
                variant="secondary"
                onPress={() => requireAccount(() => setCreating(true))}
              />
            </View>
          </Animated.View>
        ) : (
          <>
            {wishes.length > 0 && (
              <Animated.View
                entering={FadeInDown.delay(80).springify()}
                style={[styles.summary, gradientStyle(SUMMARY)]}>
                <Text variant="overline" tone="muted">
                  {t('wishlist.total')}
                </Text>
                <Text variant="display">{loading ? '…' : formatEuros(cost.amount)}</Text>
                <Text variant="caption" tone="muted">
                  {t('wishlist.costNotice')}
                  {!loading && cost.unpricedCount > 0 && t('wishlist.unpriced', { count: cost.unpricedCount })}
                </Text>
              </Animated.View>
            )}

            <Text variant="title">{t('wishlist.lists')}</Text>
            <View style={styles.grid}>
              {lists.map(({ wishlist, count, imageUrls, cost: listCost }, index) => (
                <Animated.View
                  key={wishlist.id}
                  entering={FadeInDown.delay(Math.min(index, 8) * 50)
                    .springify()
                    .damping(18)}
                  layout={LinearTransition.springify().damping(20)}
                  style={cellStyle}>
                  <WishlistTile wishlist={wishlist} count={count} imageUrls={imageUrls} cost={listCost} />
                </Animated.View>
              ))}
              <Animated.View layout={LinearTransition.springify().damping(20)} style={cellStyle}>
                <NewWishlistTile onPress={() => requireAccount(() => setCreating(true))} />
              </Animated.View>
            </View>
          </>
        )}
      </ScrollView>

      <WishlistNameSheet
        visible={creating}
        title={t('wishlist.newList')}
        submitLabel={t('common.create')}
        onClose={() => setCreating(false)}
        onSubmit={(name) => {
          createWishlist(name);
          setCreating(false);
        }}
      />
    </SafeAreaView>
  );
}

const SUMMARY = 'linear-gradient(135deg, rgba(255, 107, 157, 0.28) 0%, rgba(21, 21, 29, 1) 70%)';

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingTop: WEB_TAB_BAR_OFFSET + spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  summary: {
    gap: spacing.xs,
    padding: spacing.xl,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 107, 157, 0.3)',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -GAP / 2,
    marginTop: -spacing.md,
    rowGap: spacing.lg,
  },
  cell: {
    paddingHorizontal: GAP / 2,
  },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
  },
  emptyHeart: {
    width: 88,
    height: 88,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 44,
    backgroundColor: 'rgba(255, 107, 157, 0.12)',
  },
  centered: {
    textAlign: 'center',
  },
  emptyActions: {
    alignSelf: 'stretch',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
});
