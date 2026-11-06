import type { CardSet, SetProgress } from '@collection/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { formatPercent } from '@/lib/format';
import { PressableScale, ProgressBar, Text, gradientStyle, radius, spacing } from '@/ui';

import { setThemeOf } from './set-theme';

/** Fixed height so every card in the list lines up, with or without a logo. */
export const SET_CARD_HEIGHT = 168;

/** Only the first visible cards play the staggered entrance animation. */
const STAGGERED_COUNT = 6;

interface SetCardProps {
  set: CardSet;
  progress: SetProgress;
  /** Position in the list, used to delay the entrance animation. */
  index?: number;
}

/** Full width set card with the series gradient, the logo and the progress. */
export const SetCard = memo(function SetCard({ set, progress, index = 0 }: SetCardProps) {
  const { t } = useTranslation();
  const theme = setThemeOf(set.id);
  const started = progress.owned > 0;
  // Some TCGdex URLs point to a missing image. In that case we fall back to the text.
  const [logoFailed, setLogoFailed] = useState(false);
  const [symbolFailed, setSymbolFailed] = useState(false);
  const showLogo = set.logoUrl !== undefined && !logoFailed;
  const entering =
    index < STAGGERED_COUNT
      ? FadeInDown.delay(index * 70)
          .duration(450)
          .springify()
          .damping(16)
      : undefined;

  return (
    <Animated.View entering={entering} style={styles.wrapper}>
      <PressableScale
        accessibilityRole="button"
        onPress={() => router.push({ pathname: '/set/[setId]', params: { setId: set.id } })}
        accessibilityLabel={
          started
            ? t('catalog.setLabelStarted', { name: set.name, owned: progress.owned, total: progress.total })
            : t('catalog.setLabel', { name: set.name, total: set.cardCount.total })
        }
        style={[styles.card, gradientStyle(theme.gradient)]}>
        {set.symbolUrl && !symbolFailed && (
          <Image
            source={{ uri: set.symbolUrl }}
            style={styles.watermark}
            onError={() => setSymbolFailed(true)}
            contentFit="contain"
            cachePolicy="memory-disk"
            recyclingKey={set.id}
          />
        )}

        <View style={styles.top}>
          {showLogo ? (
            <Image
              source={{ uri: set.logoUrl }}
              style={styles.logo}
              onError={() => setLogoFailed(true)}
              contentFit="contain"
              transition={250}
              cachePolicy="memory-disk"
              recyclingKey={set.id}
              accessible={false}
            />
          ) : (
            <Text variant="title" numberOfLines={2} style={styles.fallbackName}>
              {set.name}
            </Text>
          )}
        </View>

        <View style={styles.bottom}>
          {showLogo && (
            <Text variant="heading" numberOfLines={1} style={styles.centered}>
              {set.name}
            </Text>
          )}
          <Text variant="caption" style={[styles.centered, styles.caption]}>
            {started
              ? t('catalog.setProgress', { owned: progress.owned, total: progress.total })
              : t('common.cards', { count: set.cardCount.total })}
            {started && <Text style={{ color: theme.tint }}>{formatPercent(progress.ratio)}</Text>}
          </Text>
          {started && (
            <View style={styles.progress}>
              <ProgressBar ratio={progress.ratio} height={5} color={theme.tint} trackColor={TRACK} />
            </View>
          )}
        </View>
      </PressableScale>
    </Animated.View>
  );
}, sameCard);

/**
 * Progress is recomputed as a new object whenever the collection changes. Comparing its values means only the sets that
 * actually changed are redrawn.
 */
function sameCard(previous: SetCardProps, next: SetCardProps): boolean {
  return (
    previous.set === next.set &&
    previous.index === next.index &&
    previous.progress.owned === next.progress.owned &&
    previous.progress.total === next.progress.total
  );
}

const TRACK = 'rgba(255, 255, 255, 0.1)';

const styles = StyleSheet.create({
  wrapper: {
    height: SET_CARD_HEIGHT,
  },
  card: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg + 2,
    borderRadius: radius.xl,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
    boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
  },
  watermark: {
    position: 'absolute',
    right: -28,
    top: -18,
    width: 150,
    height: 150,
    opacity: 0.09,
    transform: [{ rotate: '-12deg' }],
  },
  top: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '78%',
    maxWidth: 280,
    height: 72,
  },
  fallbackName: {
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
  bottom: {
    alignItems: 'center',
    gap: 2,
  },
  centered: {
    textAlign: 'center',
  },
  progress: {
    alignSelf: 'stretch',
    marginTop: spacing.sm,
  },
  caption: {
    color: 'rgba(255, 255, 255, 0.62)',
  },
});
