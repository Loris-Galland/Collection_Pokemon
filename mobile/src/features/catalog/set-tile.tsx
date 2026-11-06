import type { CardSet, SetProgress } from '@collection/shared';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { PressableScale, ProgressBar, Text, gradientStyle, radius, spacing } from '@/ui';

import { setThemeOf } from './set-theme';

const TILE_HEIGHT = 136;
const TRACK = 'rgba(255, 255, 255, 0.1)';

interface SetTileProps {
  set: CardSet;
  progress: SetProgress;
}

/** Small set card for the grid, with the logo, the name and the progress. */
export const SetTile = memo(
  function SetTile({ set, progress }: SetTileProps) {
    const { t } = useTranslation();
    const theme = setThemeOf(set.id);
    const started = progress.owned > 0;
    // Some TCGdex URLs point to a missing image. In that case the name is enough.
    const [logoFailed, setLogoFailed] = useState(false);
    return (
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={
          started
            ? t('catalog.setLabelStarted', { name: set.name, owned: progress.owned, total: progress.total })
            : t('catalog.setLabel', { name: set.name, total: set.cardCount.total })
        }
        onPress={() => router.push({ pathname: '/set/[setId]', params: { setId: set.id } })}
        style={[styles.tile, gradientStyle(theme.gradient)]}>
        <View style={styles.logoArea}>
          {set.logoUrl && !logoFailed ? (
            <Image
              source={{ uri: set.logoUrl }}
              style={styles.logo}
              onError={() => setLogoFailed(true)}
              contentFit="contain"
              transition={200}
              cachePolicy="memory-disk"
              recyclingKey={set.id}
              accessible={false}
            />
          ) : (
            <Text variant="heading" numberOfLines={3} style={styles.fallbackName}>
              {set.name}
            </Text>
          )}
        </View>
        {set.logoUrl && !logoFailed && (
          <Text variant="caption" numberOfLines={1} style={styles.name}>
            {set.name}
          </Text>
        )}
        <Text variant="overline" style={styles.count}>
          {started ? `${progress.owned}/${progress.total}` : set.cardCount.total}
        </Text>
        {started && <ProgressBar ratio={progress.ratio} height={3} color={theme.tint} trackColor={TRACK} />}
      </PressableScale>
    );
  },
  // Progress is a new object whenever the collection changes, so only its values are compared.
  (previous, next) =>
    previous.set === next.set &&
    previous.progress.owned === next.progress.owned &&
    previous.progress.total === next.progress.total,
);

const styles = StyleSheet.create({
  tile: {
    height: TILE_HEIGHT,
    gap: spacing.xs,
    padding: spacing.sm,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255, 255, 255, 0.12)',
    overflow: 'hidden',
  },
  logoArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  fallbackName: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 18,
  },
  name: {
    textAlign: 'center',
    fontSize: 11,
    lineHeight: 14,
  },
  count: {
    textAlign: 'center',
    color: 'rgba(255, 255, 255, 0.62)',
  },
});
