import { computeAllSetProgress, searchSetsByName, type CardSet } from '@collection/shared';
import { useDeferredValue, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ProfileButton } from '@/features/account/profile-button';
import { CardSearchResults } from '@/features/catalog/card-search-results';
import { useCardSearch, useSets } from '@/features/catalog/hooks';
import { SetCard } from '@/features/catalog/set-card';
import { prepareCardSearch } from '@/features/catalog/tcgdex';
import { SetTile } from '@/features/catalog/set-tile';
import { useCopies, useOwnedQuantities } from '@/features/collection/collection-provider';
import { useSettings } from '@/features/settings/settings-provider';
import { useWishlist } from '@/features/wishlist/wishlist-provider';
import {
  GridIcon,
  LargeCardsIcon,
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
  const { t } = useTranslation();
  const { data: sets, error, retry } = useSets();
  const copies = useCopies();
  const ownedQuantities = useOwnedQuantities();
  const { isWished } = useWishlist();
  const [search, setSearch] = useState('');
  // Typing stays quick, since the list of sets follows when the phone has time.
  const deferredSearch = useDeferredValue(search);
  const cardSearch = useCardSearch(search);
  const { catalogLanguage: language, setDisplay, setSetDisplay } = useSettings();
  const large = setDisplay === 'large';
  const largeColumns = useColumns(380, 3);
  const gridColumns = useColumns(120, 6);
  const columns = large ? largeColumns : gridColumns;

  // One pass over the collection for every set, each time the collection changes.
  const progressBySet = useMemo(() => computeAllSetProgress(sets ?? [], copies), [sets, copies]);

  const setsById = useMemo(() => new Map<string, CardSet>((sets ?? []).map((set) => [set.id, set])), [sets]);

  const visibleSets = useMemo(() => searchSetsByName(sets ?? [], deferredSearch), [sets, deferredSearch]);

  const cells = useFilledRows(visibleSets, columns);

  if (error) {
    return (
      <StateView
        title={t('catalog.unavailable')}
        message={t('common.checkConnection')}
        actionLabel={t('common.retry')}
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
        initialNumToRender={large ? 4 : 8}
        maxToRenderPerBatch={large ? 4 : 6}
        windowSize={5}
        ListHeaderComponent={
          <Animated.View entering={FadeIn.duration(400)} style={styles.header}>
            <View style={styles.titleRow}>
              <View style={styles.titleBlock}>
                <Text variant="overline" tone="accent">
                  {t('catalog.setCount', { count: sets.length })}
                </Text>
                <Text variant="display">{t('catalog.title')}</Text>
              </View>
              <ProfileButton />
            </View>
            <View style={styles.searchRow}>
              <TextInput
                value={search}
                onChangeText={setSearch}
                // The list of cards loads as soon as a search looks likely, not after the first letters.
                onFocus={() => prepareCardSearch(language)}
                placeholder={t('catalog.searchPlaceholder')}
                placeholderTextColor={colors.textFaint}
                style={styles.search}
                autoCorrect={false}
                clearButtonMode="while-editing"
                returnKeyType="search"
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={large ? t('catalog.showGrid') : t('catalog.showLarge')}
                hitSlop={6}
                onPress={() => setSetDisplay(large ? 'grid' : 'large')}
                style={({ pressed }) => [styles.displayButton, pressed && styles.pressed]}>
                {large ? <GridIcon color={colors.text} /> : <LargeCardsIcon color={colors.text} />}
              </Pressable>
            </View>
            {cardSearch.enabled && (
              <CardSearchResults
                cards={cardSearch.data?.cards}
                total={cardSearch.data?.total}
                loading={cardSearch.loading}
                error={cardSearch.error !== undefined}
                setsById={setsById}
                ownedQuantities={ownedQuantities}
                isWished={isWished}
              />
            )}
            {searching && visibleSets.length > 0 && <Text variant="title">{t('catalog.sets')}</Text>}
          </Animated.View>
        }
        ListEmptyComponent={
          // When the card search already shows results, there is no need to say that no set matches.
          cardSearch.enabled && cardSearch.data?.total !== 0 ? undefined : (
            <Text tone="muted">{t('catalog.noSet')}</Text>
          )
        }
        renderItem={({ item, index }) => (
          <View style={styles.cell}>
            {item &&
              (large ? (
                <SetCard set={item} progress={progressBySet.get(item.id)!} index={searching ? 0 : index} />
              ) : (
                <SetTile set={item} progress={progressBySet.get(item.id)!} />
              ))}
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
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  titleBlock: {
    flex: 1,
    gap: spacing.xs,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: spacing.sm,
  },
  displayButton: {
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  search: {
    flex: 1,
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
