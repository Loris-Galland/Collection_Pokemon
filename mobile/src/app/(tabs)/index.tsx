import { computeAllSetProgress, type CardSet } from '@collection/shared';
import { useMemo, useState } from 'react';
import { FlatList, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardSearchResults } from '@/features/catalog/card-search-results';
import { useCardSearch, useSets } from '@/features/catalog/hooks';
import { SetCard } from '@/features/catalog/set-card';
import { useCopies, useOwnedQuantities } from '@/features/collection/collection-provider';
import { useWishlist } from '@/features/wishlist/wishlist-provider';
import {
  MAX_CONTENT_WIDTH,
  StateView,
  Text,
  colors,
  radius,
  spacing,
  useColumns,
  useFilledRows,
  WEB_TAB_BAR_OFFSET,
} from '@/ui';

const GAP = spacing.md;

/** Catalog screen. Lists every set as a card and searches both cards and sets. */
export default function CatalogScreen() {
  const { data: sets, error, retry } = useSets();
  const copies = useCopies();
  const ownedQuantities = useOwnedQuantities();
  const { isWished } = useWishlist();
  const [search, setSearch] = useState('');
  const cardSearch = useCardSearch(search);
  const columns = useColumns(380, 3);

  // One pass over the collection for every set, each time the collection changes.
  const progressBySet = useMemo(() => computeAllSetProgress(sets ?? [], copies), [sets, copies]);

  const setsById = useMemo(() => new Map<string, CardSet>((sets ?? []).map((set) => [set.id, set])), [sets]);

  const visibleSets = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr');
    if (!query) return sets ?? [];
    return (sets ?? []).filter((set) => set.name.toLocaleLowerCase('fr').includes(query));
  }, [sets, search]);

  const cells = useFilledRows(visibleSets, columns);

  if (error) {
    return (
      <StateView
        title="Catalogue indisponible"
        message="Vérifie ta connexion, puis réessaie."
        actionLabel="Réessayer"
        onAction={retry}
      />
    );
  }
  if (!sets) return <StateView loading />;

  const searching = search.trim().length > 0;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <FlatList
        key={columns}
        data={cells}
        numColumns={columns}
        columnWrapperStyle={columns > 1 ? styles.row : undefined}
        keyExtractor={(set, index) => set?.id ?? `filler-${index}`}
        contentContainerStyle={styles.list}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        initialNumToRender={5}
        maxToRenderPerBatch={6}
        windowSize={7}
        removeClippedSubviews
        ListHeaderComponent={
          <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
            <View style={styles.titleBlock}>
              <Text variant="overline" tone="accent">
                {sets.length} extensions
              </Text>
              <Text variant="display">Catalogue</Text>
            </View>
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Rechercher une carte ou une extension"
              placeholderTextColor={colors.textFaint}
              style={styles.search}
              autoCorrect={false}
              clearButtonMode="while-editing"
              returnKeyType="search"
            />
            {cardSearch.enabled && (
              <CardSearchResults
                cards={cardSearch.data}
                loading={cardSearch.loading}
                error={cardSearch.error !== undefined}
                setsById={setsById}
                ownedQuantities={ownedQuantities}
                isWished={isWished}
              />
            )}
            {searching && visibleSets.length > 0 && <Text variant="title">Extensions</Text>}
          </Animated.View>
        }
        ListEmptyComponent={
          // When the card search already shows results, there is no need to say that no set matches.
          cardSearch.enabled && cardSearch.data?.length !== 0 ? undefined : (
            <Text tone="muted">Aucune extension ne correspond.</Text>
          )
        }
        renderItem={({ item, index }) => (
          <View style={styles.cell}>
            {item && <SetCard set={item} progress={progressBySet.get(item.id)!} index={searching ? 0 : index} />}
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  list: {
    width: '100%',
    maxWidth: MAX_CONTENT_WIDTH,
    alignSelf: 'center',
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
    gap: GAP,
  },
  cell: {
    flex: 1,
  },
  row: {
    gap: GAP,
  },
  header: {
    gap: spacing.lg,
    marginBottom: spacing.sm,
    paddingTop: WEB_TAB_BAR_OFFSET,
  },
  titleBlock: {
    gap: spacing.xs,
  },
  search: {
    color: colors.text,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md + 2,
    fontSize: 15,
  },
});
