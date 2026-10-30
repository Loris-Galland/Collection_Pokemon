import { computeSetProgress } from '@collection/shared';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { FlatList, StyleSheet, View } from 'react-native';

import { CardTile } from '@/features/catalog/card-tile';
import { useSet } from '@/features/catalog/hooks';
import { useCopies, useOwnedQuantities } from '@/features/collection/collection-provider';
import { formatPercent } from '@/lib/format';
import { ProgressBar, StateView, Text, colors, spacing } from '@/ui';

const COLUMNS = 3;

/** Set screen with all of its cards, missing ones greyed out, and the progress. It will become the binder. */
export default function SetScreen() {
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { data, error, retry } = useSet(setId);
  const copies = useCopies();
  const owned = useOwnedQuantities();

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
        contentContainerStyle={styles.grid}
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
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cell}>
            <CardTile card={item} ownedQuantity={owned.get(item.id) ?? 0} />
          </View>
        )}
      />
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
