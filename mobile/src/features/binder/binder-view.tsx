import { BINDER_PAGE_SIZE, binderPages, type Card } from '@collection/shared';
import { router } from 'expo-router';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View, type LayoutChangeEvent } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';

import { CardImage } from '@/features/catalog/card-image';
import { CARD_ASPECT_RATIO, Text, colors, radius, spacing } from '@/ui';

const COLUMNS = 3;
const POCKET_GAP = spacing.sm;
const PAGE_PADDING = spacing.md;
/** The binding on the left and the border on the right, which the pockets must leave room for. */
const BINDING = 6;
const BORDER = 1;

interface BinderViewProps {
  cards: readonly Card[];
  /** Owned quantity of each card. A card missing from it shows greyed. */
  owned: ReadonlyMap<string, number>;
}

/**
 * The set as a binder of nine pockets a page. Swiping turns the page. The next page swings in around the binding on
 * the left and lands on the current one, which darkens underneath.
 */
export function BinderView({ cards, owned }: BinderViewProps) {
  const { t } = useTranslation();
  const pages = useMemo(() => binderPages(cards), [cards]);
  const [width, setWidth] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const scrollX = useSharedValue(0);
  const reduceMotion = useReducedMotion();

  const onScroll = useAnimatedScrollHandler((event) => {
    scrollX.set(event.contentOffset.x);
  });

  const onLayout = (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width);
  // Each pocket keeps the shape of a card, and the page is sized from the width.
  const pocketWidth = (width - 2 * PAGE_PADDING - BINDING - BORDER - (COLUMNS - 1) * POCKET_GAP) / COLUMNS;
  const pageHeight =
    2 * PAGE_PADDING + 2 * BORDER + COLUMNS * (pocketWidth / CARD_ASPECT_RATIO) + (COLUMNS - 1) * POCKET_GAP;

  return (
    <View style={styles.wrap} onLayout={onLayout}>
      {width > 0 && (
        <Animated.FlatList
          data={pages}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => `page-${index}`}
          onScroll={onScroll}
          scrollEventThrottle={16}
          onMomentumScrollEnd={(event) => setPageIndex(Math.round(event.nativeEvent.contentOffset.x / width))}
          style={{ height: pageHeight }}
          initialNumToRender={2}
          windowSize={3}
          getItemLayout={(_, index) => ({ length: width, offset: width * index, index })}
          renderItem={({ item, index }) => (
            <BinderPage
              cards={item}
              index={index}
              width={width}
              height={pageHeight}
              pocketWidth={pocketWidth}
              owned={owned}
              scrollX={scrollX}
              turning={!reduceMotion}
            />
          )}
        />
      )}
      {pages.length > 1 && (
        <Text variant="caption" tone="muted" style={styles.pageNumber}>
          {t('binder.page', { page: pageIndex + 1, count: pages.length })}
        </Text>
      )}
    </View>
  );
}

interface BinderPageProps {
  cards: readonly Card[];
  index: number;
  width: number;
  height: number;
  pocketWidth: number;
  owned: ReadonlyMap<string, number>;
  scrollX: SharedValue<number>;
  turning: boolean;
}

const BinderPage = memo(function BinderPage({
  cards,
  index,
  width,
  height,
  pocketWidth,
  owned,
  scrollX,
  turning,
}: BinderPageProps) {
  const turn = useAnimatedStyle(() => {
    if (!turning) return {};
    // -1 while the page waits on the right, 0 when it lies open, 1 once the next page has covered it.
    const progress = (scrollX.get() - index * width) / width;
    if (progress < 0) {
      // Pinned in place, it swings in around the binding, from edge on to flat.
      return {
        opacity: 1,
        transform: [
          { perspective: 1400 },
          { translateX: progress * width },
          { rotateY: `${interpolate(progress, [-1, 0], [-95, 0], Extrapolation.CLAMP)}deg` },
        ],
      };
    }
    // Pinned in place under the next page, it darkens and sinks a little.
    return {
      opacity: interpolate(progress, [0, 1], [1, 0.35], Extrapolation.CLAMP),
      transform: [
        { perspective: 1400 },
        { translateX: progress * width },
        { scale: interpolate(progress, [0, 1], [1, 0.94], Extrapolation.CLAMP) },
      ],
    };
  });

  const pockets = [...cards, ...Array<null>(BINDER_PAGE_SIZE - cards.length).fill(null)];
  return (
    <Animated.View style={[styles.page, { width, height, transformOrigin: 'left center' }, turn]}>
      <View style={styles.pockets}>
        {pockets.map((card, pocket) => (
          <View key={card?.id ?? `empty-${pocket}`} style={[styles.pocket, { width: pocketWidth }]}>
            {card && <Pocket card={card} quantity={owned.get(card.id) ?? 0} />}
          </View>
        ))}
      </View>
    </Animated.View>
  );
});

function Pocket({ card, quantity }: { card: Card; quantity: number }) {
  const { t } = useTranslation();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        quantity > 0
          ? t('binder.ownedCard', { name: card.name, count: quantity })
          : t('binder.missingCard', { name: card.name })
      }
      onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId: card.id } })}>
      <CardImage imageUrl={card.imageUrl} quality="low" label={card.name} dimmed={quantity === 0} />
      {quantity > 1 && (
        <View style={styles.badge}>
          <Text variant="caption" style={styles.badgeText}>
            ×{quantity}
          </Text>
        </View>
      )}
      {quantity === 0 && (
        <Text variant="caption" tone="muted" style={styles.missingNumber}>
          {card.localId}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: spacing.sm,
  },
  page: {
    padding: PAGE_PADDING,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: BORDER,
    borderColor: colors.border,
    // The binding, on the left.
    borderLeftWidth: BINDING,
    borderLeftColor: colors.surfaceRaised,
  },
  pockets: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: POCKET_GAP,
  },
  pocket: {
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: radius.md,
    backgroundColor: colors.background,
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: colors.accent,
  },
  badgeText: {
    color: colors.accentText,
  },
  missingNumber: {
    position: 'absolute',
    bottom: 4,
    alignSelf: 'center',
  },
  pageNumber: {
    textAlign: 'center',
  },
});
