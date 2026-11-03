import { Image } from 'expo-image';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { CARD_ASPECT_RATIO, Text, colors, radius } from '@/ui';

import { cardImageUrl, type ImageQuality } from './tcgdex';

interface CardImageProps {
  imageUrl: string | undefined;
  quality: ImageQuality;
  label: string;
  dimmed?: boolean;
}

/** Card preview, with a placeholder when the image is missing. */
export function CardImage({ imageUrl, quality, label, dimmed = false }: CardImageProps) {
  const uri = cardImageUrl(imageUrl, quality);
  // Some addresses lead nowhere, and the name is better than an empty frame.
  const [failedUri, setFailedUri] = useState<string>();
  return (
    <View style={[styles.frame, dimmed && styles.dimmed]}>
      {uri && uri !== failedUri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          contentFit="cover"
          transition={200}
          cachePolicy="memory-disk"
          recyclingKey={uri}
          onError={() => setFailedUri(uri)}
          accessibilityLabel={label}
        />
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
