import { computeSetProgress, countSecretCards } from '@collection/shared';
import { Image } from 'expo-image';
import { Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, ScrollView, StyleSheet, View } from 'react-native';

import { useRequireAccount } from '@/features/account/use-account';
import { CardTile } from '@/features/catalog/card-tile';
import { useSet } from '@/features/catalog/hooks';
import { BulkAddPanel } from '@/features/collection/bulk-add-panel';
import { useCopies, useOwnedQuantities } from '@/features/collection/collection-provider';
import { useWishPicker } from '@/features/wishlist/wish-picker';
import { useWishlist } from '@/features/wishlist/wishlist-provider';
import { keptOrRemote } from '@/features/offline/catalog-files';
import { OfflineSetButton } from '@/features/offline/offline-set-button';
import { BinderView } from '@/features/binder/binder-view';
import { formatPercent } from '@/lib/format';
import { usePersistentState } from '@/lib/storage';
import { Button, ProgressBar, SegmentedControl, StateView, Text, Toast, colors, spacing, useToast } from '@/ui';

const COLUMNS = 3;

type SetView = 'grid' | 'binder';
// The last view chosen is kept for every set, on this phone only.
const restoreView = (value: unknown): SetView | undefined =>
  value === 'grid' || value === 'binder' ? value : undefined;
// Keeps the last cards reachable above the panel of the selection.
const SELECTION_PANEL_ROOM = 160;

/** Set screen with all of its cards as a grid or a binder, missing ones greyed out, and the progress. */
export default function SetScreen() {
  const { t } = useTranslation();
  const { setId } = useLocalSearchParams<{ setId: string }>();
  const { data, error, retry } = useSet(setId);
  const copies = useCopies();
  const owned = useOwnedQuantities();
  const requireAccount = useRequireAccount();
  const { wishes } = useWishlist();
  const { toggle: toggleWish, choose: chooseWishlist } = useWishPicker();
  const { toast, showToast } = useToast();
  const [selecting, setSelecting] = useState(false);
  const [view, setView] = usePersistentState<SetView>('set-view/v1', 'grid', restoreView);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());

  const wishedIds = useMemo(() => new Set(wishes.map((wish) => wish.cardId)), [wishes]);

  const stopSelecting = () => {
    setSelecting(false);
    setSelectedIds(new Set());
  };

  const startSelecting = useCallback(
    (cardId?: string) =>
      requireAccount(() => {
        setSelecting(true);
        setSelectedIds(new Set(cardId ? [cardId] : []));
      }),
    [requireAccount],
  );

  const toggleSelected = useCallback(
    (cardId: string) =>
      setSelectedIds((current) => {
        const next = new Set(current);
        if (!next.delete(cardId)) next.add(cardId);
        return next;
      }),
    [],
  );

  const selectedCards = useMemo(
    () => (data?.cards ?? []).filter((card) => selectedIds.has(card.id)),
    [data, selectedIds],
  );

  if (error) {
    return (
      <StateView
        title={t('set.notFound')}
        message={t('common.checkConnection')}
        actionLabel={t('common.retry')}
        onAction={retry}
      />
    );
  }
  if (!data) return <StateView loading />;

  const { set, cards } = data;
  const progress = computeSetProgress(set, copies);

  const header = (
    <View style={styles.header}>
      {set.logoUrl && <Image source={{ uri: keptOrRemote(set.logoUrl) }} style={styles.logo} contentFit="contain" />}
      <View style={styles.progressLine}>
        <Text variant="heading">
          {progress.owned}/{progress.total}
        </Text>
        <Text variant="caption" tone="muted">
          {formatPercent(progress.ratio)} · {t('set.secrets', { count: countSecretCards(set) })}
        </Text>
      </View>
      <ProgressBar ratio={progress.ratio} />
      {!selecting && (
        <SegmentedControl
          options={[
            { value: 'grid', label: t('set.viewGrid') },
            { value: 'binder', label: t('set.viewBinder') },
          ]}
          value={view}
          onChange={setView}
        />
      )}
      {!selecting && (
        <>
          {view === 'grid' && (
            <Button label={t('set.addSeveral')} variant="secondary" onPress={() => startSelecting()} />
          )}
          <OfflineSetButton set={set} />
        </>
      )}
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: set.name }} />
      {view === 'binder' ? (
        <ScrollView style={styles.screen} contentContainerStyle={styles.grid}>
          {header}
          <BinderView cards={cards} owned={owned} />
        </ScrollView>
      ) : (
        <FlatList
          data={cards}
          keyExtractor={(card) => card.id}
          numColumns={COLUMNS}
          style={styles.screen}
          contentContainerStyle={[styles.grid, selecting && { paddingBottom: SELECTION_PANEL_ROOM }]}
          extraData={[selectedIds, wishedIds]}
          initialNumToRender={4}
          maxToRenderPerBatch={4}
          windowSize={5}
          columnWrapperStyle={styles.row}
          ListHeaderComponent={header}
          renderItem={({ item }) => (
            <View style={styles.cell}>
              <CardTile
                card={item}
                ownedQuantity={owned.get(item.id) ?? 0}
                selecting={selecting}
                selected={selectedIds.has(item.id)}
                onToggleSelected={toggleSelected}
                onStartSelecting={startSelecting}
                wished={wishedIds.has(item.id)}
                onToggleWish={toggleWish}
                onChooseWishlist={chooseWishlist}
              />
            </View>
          )}
        />
      )}
      {selecting && (
        <BulkAddPanel
          selected={selectedCards}
          onCancel={stopSelecting}
          onSelectMissing={() =>
            setSelectedIds(new Set(cards.filter((card) => !owned.has(card.id)).map((card) => card.id)))
          }
          onDone={(addedCount, failedIds) => {
            showToast(
              failedIds.length > 0
                ? t('set.addedWithFailures', {
                    count: addedCount,
                    failed: t('common.cards', { count: failedIds.length }),
                  })
                : t('set.added', { count: addedCount }),
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
