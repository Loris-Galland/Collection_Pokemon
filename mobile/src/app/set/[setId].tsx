import { computeSetProgress } from '@collection/shared';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';

import { useRequireAccount } from '@/features/account/use-account';
import { CardTile } from '@/features/catalog/card-tile';
import { useSet } from '@/features/catalog/hooks';
import { BulkAddPanel } from '@/features/collection/bulk-add-panel';
import { useCollectionStatus, useCopies, useOwnedQuantities } from '@/features/collection/collection-provider';
import { formatPercent } from '@/lib/format';
import { Button, ProgressBar, StateView, Text, Toast, colors, spacing, useToast } from '@/ui';

const COLUMNS = 3;
// Keeps the last cards reachable above the panel of the selection.
const SELECTION_PANEL_ROOM = 160;

const cardsLabel = (count: number) => `${count} carte${count > 1 ? 's' : ''}`;

/** Set screen with all of its cards, missing ones greyed out, and the progress. It will become the binder. */
export default function SetScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { data, error, retry } = useSet(setId);
  const copies = useCopies();
  const owned = useOwnedQuantities();
  const readOnly = useCollectionStatus() === 'read-only';
  const requireAccount = useRequireAccount();
  const { toast, showToast } = useToast();
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const stopSelecting = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const startSelecting = (cardId?: string) =>
    requireAccount(() => {
      setSelecting(true);
      setSelectedIds(new Set(cardId ? [cardId] : []));
    });

  const toggleSelected = (cardId: string) =>
    setSelectedIds((current) => {
      const next = new Set(current);
      if (!next.delete(cardId)) next.add(cardId);
      return next;
    });

  if (error) {
    return (
      <StateView
        title="Extension introuvable"
        message="Vérifie ta connexion, puis réessaie."
        actionLabel="Réessayer"
        onAction={retry}
      />
    );
  }
  if (!data) return <StateView loading />;

  const { set, cards } = data;
  const progress = computeSetProgress(set, copies);

  return (
    <>
      <Stack.Screen options={{ title: set.name }} />
      <FlatList
        data={cards}
        keyExtractor={(card) => card.id}
        numColumns={COLUMNS}
        style={styles.screen}
        contentContainerStyle={[styles.grid, selecting && { paddingBottom: SELECTION_PANEL_ROOM }]}
        extraData={selectedIds}
        columnWrapperStyle={styles.row}
        ListHeaderComponent={
          <View style={styles.header}>
            {set.logoUrl && <Image source={{ uri: set.logoUrl }} style={styles.logo} contentFit="contain" />}
            <View style={styles.progressLine}>
              <Text variant="heading">
                {progress.owned}/{progress.total}
              </Text>
              <Text variant="caption" tone="muted">
                {formatPercent(progress.ratio)} · {set.cardCount.total - set.cardCount.official} secrètes
              </Text>
            </View>
            <ProgressBar ratio={progress.ratio} />
            {!readOnly && !selecting && <Button label="Ajouter plusieurs cartes" variant="secondary" onPress={() => startSelecting()} />}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <CardTile
              card={item}
              ownedQuantity={owned.get(item.id) ?? 0}
              selecting={selecting}
              selected={selectedIds.has(item.id)}
              onToggleSelected={toggleSelected}
              onStartSelecting={readOnly ? undefined : startSelecting}
            />
          </View>
        )}
      />
      {selecting && (
        <BulkAddPanel
          selected={cards.filter((card) => selectedIds.has(card.id))}
          onCancel={stopSelecting}
          onSelectMissing={() => setSelectedIds(new Set(cards.filter((card) => !owned.has(card.id)).map((card) => card.id)))}
          onDone={(addedCount, failedIds) => {
            showToast(
              failedIds.length > 0
                ? `${cardsLabel(addedCount)} ajoutée${addedCount > 1 ? 's' : ''}. ${cardsLabel(failedIds.length)} à réessayer.`
                : `${cardsLabel(addedCount)} ajoutée${addedCount > 1 ? 's' : ''} à ta collection`,
            );
            if (failedIds.length > 0) setSelectedIds(new Set(failedIds));
            else stopSelecting();
          }}
        />
      )}
      <Toast toast={toast} />
    </>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  grid: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  row: {
    gap: spacing.md,
  },
  cell: {
    flex: 1 / COLUMNS,
  },
  header: {
    gap: spacing.md,
    marginBottom: spacing.sm,
  },
  logo: {
    height: 72,
    width: '100%',
  },
  progressLine: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
  },
});
