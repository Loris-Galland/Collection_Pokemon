import { computeAllSetProgress, summarizeCollection } from '@collection/shared';
import { useMemo } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSets } from '@/features/catalog/hooks';
import { SetCard } from '@/features/catalog/set-card';
import { useCopies } from '@/features/collection/collection-provider';
import { useCollectionValue } from '@/features/collection/use-collection-value';
import { formatEuros } from '@/lib/format';
import { Text, WEB_TAB_BAR_OFFSET, colors, radius, spacing } from '@/ui';

/** Collection screen with the collection value, key figures and progress per set. */
export default function CollectionScreen() {
  const copies = useCopies();
  const { data: sets } = useSets();
  const { value, loading } = useCollectionValue();

  const { copyCount, distinctCardCount } = useMemo(() => summarizeCollection(copies), [copies]);

  const startedSets = useMemo(() => {
    const progressBySet = computeAllSetProgress(sets ?? [], copies);
    return (sets ?? [])
      .map((set) => ({ set, progress: progressBySet.get(set.id)! }))
      .filter(({ progress }) => progress.owned > 0)
      .sort((a, b) => b.progress.ratio - a.progress.ratio);
  }, [sets, copies]);

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="display">Collection</Text>

        <View style={styles.valueCard}>
          <Text variant="overline" tone="muted">
            Valeur de la collection
          </Text>
          <Text variant="display" tone="accent">
            {loading ? '…' : formatEuros(value.amount)}
          </Text>
          <Text variant="caption" tone="faint">
            Prix moyens Cardmarket, indicatifs : ce ne sont pas des prix de vente réels.
            {value.unpricedCopyCount > 0 && ` ${value.unpricedCopyCount} exemplaire(s) sans prix, comptés pour 0 €.`}
          </Text>
        </View>

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
      </ScrollView>
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
    padding: spacing.lg,
    paddingTop: WEB_TAB_BAR_OFFSET + spacing.lg,
    gap: spacing.lg,
  },
  valueCard: {
    gap: spacing.xs,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
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
