import { VARIANT_LABELS, sharesShinyPrice } from '@collection/shared';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeInDown } from 'react-native-reanimated';

import { CardImage } from '@/features/catalog/card-image';
import { useCard } from '@/features/catalog/hooks';
import { PriceTrendCard } from '@/features/catalog/price-trend-card';
import { AddCopyForm } from '@/features/collection/add-copy-form';
import { CollectionNotice } from '@/features/collection/collection-notice';
import { useCollectionStatus, useCopies } from '@/features/collection/collection-provider';
import { CopyRow } from '@/features/collection/copy-row';
import { WishButton } from '@/features/wishlist/wish-button';
import { useWishlist } from '@/features/wishlist/wishlist-provider';
import { formatEuros } from '@/lib/format';
import { StateView, Text, Toast, colors, radius, spacing, useToast } from '@/ui';

/** Card screen with the preview, prices, owned copies and the add form. */
export default function CardScreen() {
  const { cardId } = useLocalSearchParams<{ cardId: string }>();
  const { data, error, retry } = useCard(cardId);
  const copies = useCopies();
  const readOnly = useCollectionStatus() === 'read-only';
  const { obtainedCardIds } = useWishlist();
  const { toast, showToast } = useToast();

  if (error) {
    return (
      <StateView
        title="Carte introuvable"
        message="Vérifie ta connexion, puis réessaie."
        actionLabel="Réessayer"
        onAction={retry}
      />
    );
  }
  if (!data) return <StateView loading />;

  const { card, set, prices, trends } = data;
  const ownedCopies = copies.filter((copy) => copy.cardId === card.id);

  return (
    <>
      <Stack.Screen options={{ title: card.name }} />
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.imageWrap}>
          <CardImage imageUrl={card.imageUrl} quality="high" label={card.name} />
        </View>

        <View style={styles.titleBlock}>
          <Text variant="title">{card.name}</Text>
          <Text tone="muted">
            {set.name} · {card.localId}/{set.cardCount.official}
            {card.rarity ? ` · ${card.rarity}` : ''}
          </Text>
          {ownedCopies.length === 0 && <WishButton cardId={card.id} setId={card.setId} />}
          {obtainedCardIds.has(card.id) && (
            <Animated.View entering={FadeInDown.springify()} style={styles.obtained}>
              <Text variant="caption" style={{ color: colors.success }}>
                ✓ Obtenue ! Retirée de ta liste d’envies.
              </Text>
            </Animated.View>
          )}
        </View>

        <PriceTrendCard trends={trends} />

        <View style={styles.section}>
          <Text variant="overline" tone="muted">
            Prix indicatif Cardmarket
          </Text>
          {card.variants.map((variant) => {
            const price = prices.find((p) => p.variant === variant);
            return (
              <View key={variant} style={styles.priceRow}>
                <Text>{VARIANT_LABELS[variant]}</Text>
                <Text variant="heading" tone={price ? 'accent' : 'faint'}>
                  {price ? formatEuros(price.amount) : 'Prix indisponible'}
                </Text>
              </View>
            );
          })}
          {sharesShinyPrice(card.variants) && (
            <Text variant="caption" tone="faint">
              Cardmarket ne donne qu’un prix pour les versions brillantes : holo et reverse affichent le même.
            </Text>
          )}
        </View>

        <CollectionNotice />

        {ownedCopies.length > 0 && (
          <View style={styles.owned}>
            <Text variant="title">Mes exemplaires</Text>
            {ownedCopies.map((copy) => (
              <CopyRow key={copy.id} copy={copy} />
            ))}
          </View>
        )}

        {!readOnly && (
          <View style={styles.owned}>
            <Text variant="title">Ajouter</Text>
            <AddCopyForm
              key={card.id}
              card={card}
              onAdded={(quantity) =>
                showToast(quantity > 1 ? `${quantity} exemplaires ajoutés à ta collection` : 'Ajoutée à ta collection')
              }
            />
          </View>
        )}
      </ScrollView>
      <Toast toast={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.xl,
    paddingBottom: spacing.xxl * 2,
  },
  imageWrap: {
    width: '78%',
    alignSelf: 'center',
    shadowColor: colors.accent,
    shadowOpacity: 0.18,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
  },
  titleBlock: {
    gap: spacing.sm,
  },
  obtained: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: 'rgba(74, 222, 128, 0.12)',
  },
  section: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  owned: {
    gap: spacing.md,
  },
});
