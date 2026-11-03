import { computeAllSetProgress, priceKey, summarizeCollection, type Copy } from '@collection/shared';
import { useMemo } from 'react';
import { FlatList, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSets } from '@/features/catalog/hooks';
import { SetCard } from '@/features/catalog/set-card';
import { CollectionValueCard } from '@/features/collection/collection-value-card';
import { useCopies } from '@/features/collection/collection-provider';
import { CopyTile } from '@/features/collection/copy-tile';
import { useCollectionValue } from '@/features/collection/use-collection-value';
import { MAX_CONTENT_WIDTH, Text, WEB_TAB_BAR_OFFSET, colors, radius, spacing, useColumns, useFilledRows } from '@/ui';

/** Collection screen with the collection value, key figures, progress per set and every owned copy. */
export default function CollectionScreen() {
  const copies = useCopies();
  const { data: sets } = useSets();
  const { value, valueTrend, cards, prices, loading } = useCollectionValue();
  const columns = useColumns(120, 8);

  const { copyCount, distinctCardCount } = useMemo(() => summarizeCollection(copies), [copies]);

  const startedSets = useMemo(() => {
    const progressBySet = computeAllSetProgress(sets ?? [], copies);
    return (sets ?? [])
      .map((set) => ({ set, progress: progressBySet.get(set.id)! }))
      .filter(({ progress }) => progress.owned > 0)
      .sort((a, b) => b.progress.ratio - a.progress.ratio);
  }, [sets, copies]);

  const priceOf = (copy: Copy) => prices.get(priceKey(copy.cardId, copy.variant))?.amount;

  // The most valuable copies come first, and those with no known price last.
  const sortedCopies = useMemo(
    () =>
      [...copies].sort(
        (a, b) =>
          (prices.get(priceKey(b.cardId, b.variant))?.amount ?? -1) -
          (prices.get(priceKey(a.cardId, a.variant))?.amount ?? -1),
      ),
    [copies, prices],
  );
  const cells = useFilledRows(sortedCopies, columns);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        key={columns}
        data={cells}
        numColumns={columns}
        keyExtractor={(copy, index) => copy?.id ?? `empty-${index}`}
        contentContainerStyle={styles.content}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        ListHeaderComponent={
          <View style={styles.header}>
            <Text variant="display">Collection</Text>

            <CollectionValueCard value={value} valueTrend={valueTrend} loading={loading} />

            <View style={styles.stats}>
              <Stat label="Exemplaires" value={copyCount} />
              <Stat label="Cartes distinctes" value={distinctCardCount} />
              <Stat label="Extensions" value={startedSets.length} />
            </View>

            <Text variant="title">Progression</Text>
            {startedSets.length === 0 ? (
              <Text tone="muted">
                Ta collection est vide. Ouvre une extension dans le Catalogue et ajoute tes premières cartes.
              </Text>
            ) : (
              <View style={styles.sets}>
                {startedSets.map(({ set, progress }, index) => (
                  <SetCard key={set.id} set={set} progress={progress} index={index} />
                ))}
              </View>
            )}

            {copies.length > 0 && <Text variant="title">Mes exemplaires</Text>}
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            {item && <CopyTile copy={item} card={cards.get(item.cardId)?.card} price={priceOf(item)} />}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.stat}>
      <Text variant="title">{value}</Text>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
    </View>
  );
}

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
    gap: spacing.md,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.xs,
  },
  row: {
    gap: spacing.md,
  },
  cell: {
    flex: 1,
  },
  stats: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stat: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  sets: {
    gap: spacing.sm,
  },
});
