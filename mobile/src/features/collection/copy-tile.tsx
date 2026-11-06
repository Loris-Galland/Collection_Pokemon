import {
  CONDITION_ABBREVIATIONS,
  CONDITION_LABELS,
  type Card,
  type Condition,
  type Copy,
} from '@collection/shared';
import { Link } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { CardImage } from '@/features/catalog/card-image';
import { formatEuros } from '@/lib/format';
import { PressableScale, Text, colors, radius, spacing } from '@/ui';

/** From green to red, following the Cardmarket scale. The abbreviation carries the same meaning without the color. */
const CONDITION_COLORS: Record<Condition, string> = {
  mint: '#4ADE80',
  'near-mint': '#4ADE80',
  excellent: '#A3E635',
  good: '#FACC15',
  'light-played': '#FB923C',
  played: '#F97316',
  poor: '#F87171',
};

interface CopyTileProps {
  copy: Copy;
  /** Undefined until the card is loaded. */
  card: Card | undefined;
  /** Average price of the copy, undefined when it is unknown. */
  price: number | undefined;
}

/** An owned copy on the collection screen, with its price at the top left and its condition at the bottom right. */
export function CopyTile({ copy, card, price }: CopyTileProps) {
  const name = card?.name ?? copy.cardId;
  const { t } = useTranslation();
  const priceLabel = price === undefined ? t('common.unknownPrice') : formatEuros(price);
  return (
    <Link href={{ pathname: '/card/[cardId]', params: { cardId: copy.cardId } }} asChild>
      <PressableScale
        accessibilityLabel={t('collection.copyLabel', {
          name,
          variant: t(`variants.${copy.variant}`),
          condition: CONDITION_LABELS[copy.condition],
          price: priceLabel,
          quantity: copy.quantity,
        })}>
        <CardImage imageUrl={card?.imageUrl} quality="low" label={name} />
        <View style={[styles.badge, styles.topLeft]}>
          <Text variant="overline" style={price === undefined ? styles.unknownPrice : styles.price}>
            {price === undefined ? '— €' : formatEuros(price)}
          </Text>
        </View>
        {copy.quantity > 1 && (
          <View style={[styles.badge, styles.topRight, styles.quantity]}>
            <Text variant="overline" style={{ color: colors.accentText }}>
              ×{copy.quantity}
            </Text>
          </View>
        )}
        <View style={[styles.badge, styles.bottomRight]}>
          <Text variant="overline" style={{ color: CONDITION_COLORS[copy.condition] }}>
            {CONDITION_ABBREVIATIONS[copy.condition]}
          </Text>
        </View>
      </PressableScale>
    </Link>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: radius.sm,
    backgroundColor: colors.overlay,
  },
  topLeft: {
    top: spacing.xs,
    left: spacing.xs,
  },
  topRight: {
    top: spacing.xs,
    right: spacing.xs,
  },
  bottomRight: {
    bottom: spacing.xs,
    right: spacing.xs,
  },
  quantity: {
    backgroundColor: colors.accent,
  },
  price: {
    color: colors.text,
    letterSpacing: 0,
  },
  unknownPrice: {
    color: colors.textMuted,
    letterSpacing: 0,
  },
});
