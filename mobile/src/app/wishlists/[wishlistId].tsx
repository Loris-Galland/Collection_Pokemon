import { wishesOf } from '@collection/shared';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';

import { useWishCards } from '@/features/wishlist/use-wish-cards';
import { WishTile } from '@/features/wishlist/wish-tile';
import { WishlistNameForm } from '@/features/wishlist/wishlist-name-sheet';
import { useWishlist, useWishlistActions } from '@/features/wishlist/wishlist-provider';
import { formatEuros } from '@/lib/format';
import {
  Button,
  MAX_CONTENT_WIDTH,
  MoreIcon,
  Sheet,
  StateView,
  Text,
  colors,
  gradientStyle,
  radius,
  spacing,
  useColumns,
} from '@/ui';

const GAP = spacing.md;

type Panel = 'options' | 'rename' | 'delete';

/** One list of wishes, with its cards and what they would cost. The list can be renamed or deleted. */
export default function WishlistScreen() {
  const { t } = useTranslation();
  const { wishlistId } = useLocalSearchParams<{ wishlistId: string }>();
  const { wishlists, wishes } = useWishlist();
  const { renameWishlist, deleteWishlist } = useWishlistActions();
  const wishlist = wishlists.find((entry) => entry.id === wishlistId);
  const listWishes = useMemo(() => wishesOf({ wishes }, wishlistId), [wishes, wishlistId]);
  const { cards, loading, costOf } = useWishCards(listWishes);
  const columns = useColumns(165, 6);
  const [panel, setPanel] = useState<Panel>();
  // What the sheet shows, kept while it slides away so its content does not change on the way out.
  const [view, setView] = useState<Panel>('options');
  if (panel && panel !== view) setView(panel);

  const cost = useMemo(() => costOf(listWishes), [costOf, listWishes]);

  if (!wishlist) {
    return <StateView title={t('wishlist.listNotFound')} actionLabel={t('common.back')} onAction={() => router.back()} />;
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: wishlist.name,
          headerRight: () => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={t('wishlist.options')}
              hitSlop={10}
              onPress={() => setPanel('options')}
              style={({ pressed }) => [styles.headerButton, pressed && styles.pressed]}>
              <MoreIcon color={colors.text} size={22} />
            </Pressable>
          ),
        }}
      />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        {listWishes.length === 0 ? (
          <Text tone="muted" style={styles.emptyText}>
            {t('wishlist.listEmpty')}
          </Text>
        ) : (
          <>
            <Animated.View entering={FadeInDown.springify()} style={[styles.summary, gradientStyle(SUMMARY)]}>
              <Text variant="overline" tone="muted">
                {t('common.cards', { count: listWishes.length })}
              </Text>
              <Text variant="display">{loading ? '…' : formatEuros(cost.amount)}</Text>
              <Text variant="caption" tone="muted">
                {t('wishlist.costNotice')}
                {!loading && cost.unpricedCount > 0 && t('wishlist.unpriced', { count: cost.unpricedCount })}
              </Text>
            </Animated.View>

            <View style={styles.grid}>
              {listWishes.map((wish, index) => (
                <Animated.View
                  key={wish.cardId}
                  entering={FadeInDown.delay(Math.min(index, 8) * 40)
                    .springify()
                    .damping(18)}
                  exiting={FadeOut.duration(180)}
                  layout={LinearTransition.springify().damping(20)}
                  style={[styles.cell, { width: `${100 / columns}%` }]}>
                  <WishTile wish={wish} detail={cards.get(wish.cardId)} />
                </Animated.View>
              ))}
            </View>
          </>
        )}
      </ScrollView>

      <Sheet
        visible={panel !== undefined}
        onClose={() => setPanel(undefined)}
        title={
          view === 'delete'
            ? t('wishlist.deleteTitle', { name: wishlist.name })
            : view === 'rename'
              ? t('wishlist.renameTitle')
              : wishlist.name
        }
        subtitle={
          view === 'delete'
            ? listWishes.length === 0
              ? t('wishlist.deleteEmptyText')
              : t('wishlist.deleteText', { count: listWishes.length })
            : undefined
        }>
        {view === 'rename' ? (
          <WishlistNameForm
            initialName={wishlist.name}
            submitLabel={t('common.save')}
            onSubmit={(name) => {
              renameWishlist(wishlist.id, name);
              setPanel(undefined);
            }}
          />
        ) : view === 'delete' ? (
          <View style={styles.actions}>
            <Button
              label={t('common.delete')}
              onPress={() => {
                setPanel(undefined);
                deleteWishlist(wishlist.id);
                router.back();
              }}
            />
            <Button label={t('common.cancel')} variant="secondary" onPress={() => setPanel(undefined)} />
          </View>
        ) : (
          <View style={styles.actions}>
            <Button label={t('common.rename')} variant="secondary" onPress={() => setPanel('rename')} />
            <Button label={t('common.delete')} variant="secondary" onPress={() => setPanel('delete')} />
          </View>
        )}
      </Sheet>

    </>
  );
}

const SUMMARY = 'linear-gradient(135deg, rgba(255, 107, 157, 0.28) 0%, rgba(21, 21, 29, 1) 70%)';

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: spacing.xl,
  },
  headerButton: {
    padding: spacing.xs,
  },
  pressed: {
    opacity: 0.6,
  },
  emptyText: {
    textAlign: 'center',
    paddingVertical: spacing.xxl,
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
    rowGap: spacing.lg,
  },
  cell: {
    paddingHorizontal: GAP / 2,
  },
  actions: {
    gap: spacing.sm,
  },
});
