import { computeWishlistCost } from '@collection/shared';
import { router } from 'expo-router';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown, FadeOut, LinearTransition } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useCards } from '@/features/catalog/hooks';
import { WishTile } from '@/features/wishlist/wish-tile';
import { useWishlist } from '@/features/wishlist/wishlist-provider';
import { formatEuros } from '@/lib/format';
import {
  Button,
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

/** Wishlist screen with the cards you want and what they would cost. */
export default function WishlistScreen() {
  const { wishlist } = useWishlist();
  const cardIds = useMemo(() => wishlist.map((wish) => wish.cardId), [wishlist]);
  const { cards, loading } = useCards(cardIds);
  const columns = useColumns(165, 6);

  const cost = useMemo(() => {
    const pricesByCard = new Map([...cards].map(([cardId, detail]) => [cardId, detail.prices]));
    return computeWishlistCost(wishlist, pricesByCard);
  }, [wishlist, cards]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Animated.View entering={FadeIn.duration(400)} style={styles.titleBlock}>
          <Text variant="overline" style={{ color: colors.wish }}>
            {wishlist.length} carte{wishlist.length > 1 ? 's' : ''}
          </Text>
          <Text variant="display">Envies</Text>
        </Animated.View>

        {wishlist.length === 0 ? (
          <Animated.View entering={FadeInDown.springify()} style={styles.empty}>
            <Text style={styles.emptyHeart}>♡</Text>
            <Text variant="heading" style={styles.centered}>
              Ta liste d’envies est vide
            </Text>
            <Text tone="muted" style={styles.centered}>
              Ouvre une carte et touche « Ajouter à mes envies ». Elle quittera la liste dès qu’elle sera dans ta
              collection.
            </Text>
            <View style={styles.emptyAction}>
              <Button label="Chercher une carte" onPress={() => router.navigate('/')} />
            </View>
          </Animated.View>
        ) : (
          <>
            <Animated.View entering={FadeInDown.delay(80).springify()} style={[styles.summary, gradientStyle(SUMMARY)]}>
              <Text variant="overline" tone="muted">
                Pour tout obtenir
              </Text>
              <Text variant="display">{loading ? '…' : formatEuros(cost.amount)}</Text>
              <Text variant="caption" tone="muted">
                Prix moyens Cardmarket de la variante la moins chère, indicatifs.
                {!loading &&
                  cost.unpricedCount > 0 &&
                  ` ${cost.unpricedCount} carte(s) sans prix, comptée(s) pour 0 €.`}
              </Text>
            </Animated.View>

            <View style={styles.grid}>
              {wishlist.map((wish, index) => (
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
    fontSize: 56,
    lineHeight: 64,
    color: colors.wish,
  },
  centered: {
    textAlign: 'center',
  },
  emptyAction: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
});
