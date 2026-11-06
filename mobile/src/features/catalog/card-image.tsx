import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

import { CARD_ASPECT_RATIO, PokeballLoader, Text, colors, radius } from '@/ui';

import { cardImageUrl, type ImageQuality } from './tcgdex';

const LOADER_DELAY_MS = 150;

interface CardImageProps {
  imageUrl: string | undefined;
  quality: ImageQuality;
  label: string;
  dimmed?: boolean;
}

/** Card preview, with a spinning Poké Ball while it loads and a placeholder when the image is missing. */
export function CardImage({ imageUrl, quality, label, dimmed = false }: CardImageProps) {
  const uri = cardImageUrl(imageUrl, quality);
  // Some addresses lead nowhere, and the name is better than an empty frame.
  const [failedUri, setFailedUri] = useState<string>();
  const [loadedUri, setLoadedUri] = useState<string>();
  return (
    <View style={[styles.frame, dimmed && styles.dimmed]}>
      {uri && uri !== failedUri ? (
        <>
          {uri !== loadedUri && (
            // Shown after a short delay, so a picture already in the cache does not flash a loader.
            <Animated.View entering={FadeIn.delay(LOADER_DELAY_MS)} style={styles.loader}>
              <PokeballLoader size={quality === 'high' ? 56 : 26} />
            </Animated.View>
          )}
          <Image
            source={{ uri }}
            style={StyleSheet.absoluteFill}
            contentFit="cover"
            transition={200}
            cachePolicy="memory-disk"
            recyclingKey={uri}
            onLoad={() => setLoadedUri(uri)}
            onError={() => setFailedUri(uri)}
            accessibilityLabel={label}
          />
        </>
      ) : (
        <View style={styles.placeholder}>
          <Text variant="caption" tone="faint" numberOfLines={3} style={styles.placeholderText}>
            {label}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    aspectRatio: CARD_ASPECT_RATIO,
    borderRadius: radius.md,
    overflow: 'hidden',
    backgroundColor: colors.surfaceRaised,
  },
  dimmed: {
    opacity: 0.28,
  },
  loader: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: 'dashed',
  },
  placeholderText: {
    textAlign: 'center',
  },
});
