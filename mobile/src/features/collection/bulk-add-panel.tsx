import {
  CONDITIONS,
  CONDITION_ABBREVIATIONS,
  CONDITION_LABELS,
  DEFAULT_CONDITION,
  pickVariant,
  type Card,
  type Condition,
  type CopyInput,
  type Language,
  type Variant,
} from '@collection/shared';
import { memo, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRequireAccount } from '@/features/account/use-account';
import { CardImage } from '@/features/catalog/card-image';
import { loadCards } from '@/features/catalog/hooks';
import { useSettings } from '@/features/settings/settings-provider';
import { Button, Chip, SegmentedControl, SelectField, Text, colors, radius, spacing } from '@/ui';

import { Field, useLanguageOptions } from './add-copy-form';
import { useCollectionActions } from './collection-provider';

// Most cards exist in these, and a card that does not falls back on what it has.
const PREFERRED_VARIANTS: readonly Variant[] = ['normal', 'holo', 'reverse'];

const CONDITION_OPTIONS = CONDITIONS.map((condition) => ({
  value: condition,
  label: CONDITION_ABBREVIATIONS[condition],
  accessibilityLabel: CONDITION_LABELS[condition],
}));

const CARD_THUMBNAIL_WIDTH = 44;

interface BulkAddPanelProps {
  selected: readonly Card[];
  onCancel: () => void;
  onSelectMissing: () => void;
  /** `failedIds` are the cards that could not be loaded, and stay selected so they can be tried again. */
  onDone: (addedCount: number, failedIds: readonly string[]) => void;
}

/** Bar under a selection of cards, which adds them all at once with one language and a condition for each card. */
export function BulkAddPanel({ selected, onCancel, onSelectMissing, onDone }: BulkAddPanelProps) {
  const { t } = useTranslation();
  const languageOptions = useLanguageOptions();
  const { addMany } = useCollectionActions();
  const requireAccount = useRequireAccount();
  const settings = useSettings();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [progress, setProgress] = useState<number>();
  const busy = progress !== undefined;
  const [preferredVariant, setPreferredVariant] = useState<Variant>('normal');
  const [language, setLanguage] = useState<Language>(settings.catalogLanguage);
  // The condition of most cards, and the ones chosen for a single card.
  const [commonCondition, setCommonCondition] = useState<Condition>(DEFAULT_CONDITION);
  const [cardConditions, setCardConditions] = useState<ReadonlyMap<string, Condition>>(new Map());

  const conditionOf = (cardId: string) => cardConditions.get(cardId) ?? commonCondition;

  const setCardCondition = useCallback(
    (cardId: string, condition: Condition) => setCardConditions((current) => new Map(current).set(cardId, condition)),
    [],
  );

  const setEveryCondition = (condition: Condition) => {
    setCommonCondition(condition);
    setCardConditions(new Map());
  };

  const addAll = () =>
    requireAccount(async () => {
      setProgress(0);
      // The variants of a card are only known once the card itself is loaded.
      const details = await loadCards(settings.catalogLanguage, selected.map((card) => card.id), setProgress);
      const failedIds: string[] = [];
      const inputs: CopyInput[] = [];
      for (const card of selected) {
        const detail = details.get(card.id);
        if (!detail) {
          failedIds.push(card.id);
          continue;
        }
        const variant = pickVariant(detail.card.variants, preferredVariant);
        inputs.push({ cardId: card.id, setId: card.setId, variant, language, condition: conditionOf(card.id), quantity: 1 });
      }
      addMany(inputs);
      setProgress(undefined);
      setOpen(false);
      onDone(inputs.length, failedIds);
    });

  const count = selected.length;
  return (
    <View style={[styles.panel, { paddingBottom: insets.bottom + spacing.md }]}>
      {open && (
        <FlatList
          data={selected}
          keyExtractor={(card) => card.id}
          extraData={[cardConditions, commonCondition]}
          style={{ maxHeight: height * 0.62 }}
          contentContainerStyle={styles.options}
          initialNumToRender={6}
          ListHeaderComponent={
            <View style={styles.options}>
              <Field label={t('addCopy.variant')}>
                {PREFERRED_VARIANTS.map((v) => (
                  <Chip key={v} label={t(`variants.${v}`)} selected={v === preferredVariant} onPress={() => setPreferredVariant(v)} />
                ))}
              </Field>
              <Text variant="caption" tone="faint">
                {t('bulkAdd.variantFallback')}
              </Text>
              <SelectField
                label={t('addCopy.language')}
                value={language}
                options={languageOptions}
                onChange={setLanguage}
              />
              <Field label={t('bulkAdd.everyCondition')}>
                {CONDITIONS.map((c) => (
                  <Chip
                    key={c}
                    label={CONDITION_LABELS[c]}
                    selected={cardConditions.size === 0 && c === commonCondition}
                    onPress={() => setEveryCondition(c)}
                  />
                ))}
              </Field>
              <Text variant="overline" tone="muted">
                {t('bulkAdd.conditionPerCard')}
              </Text>
            </View>
          }
          renderItem={({ item }) => <CardConditionRow card={item} condition={conditionOf(item.id)} onChange={setCardCondition} />}
        />
      )}
      {open ? (
        <View style={styles.actions}>
          <View style={styles.secondaryAction}>
            <Button label={t('common.back')} variant="secondary" disabled={busy} onPress={() => setOpen(false)} />
          </View>
          <View style={styles.primaryAction}>
            <Button label={busy ? t('common.waitProgress', { done: progress, total: count }) : t('bulkAdd.addCards', { count })} disabled={busy} onPress={addAll} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.links}>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel}>
              <Text variant="caption" tone="muted">
                {t('common.cancel')}
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onSelectMissing}>
              <Text variant="caption" tone="accent">
                {t('bulkAdd.allMissing')}
              </Text>
            </Pressable>
          </View>
          <Button
            label={count > 0 ? t('bulkAdd.continueCount', { count }) : t('bulkAdd.touchCards')}
            disabled={count === 0}
            onPress={() => setOpen(true)}
          />
        </>
      )}
    </View>
  );
}

interface CardConditionRowProps {
  card: Card;
  condition: Condition;
  onChange: (cardId: string, condition: Condition) => void;
}

const CardConditionRow = memo(function CardConditionRow({ card, condition, onChange }: CardConditionRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.thumbnail}>
        <CardImage imageUrl={card.imageUrl} quality="low" label="" />
      </View>
      <View style={styles.rowContent}>
        <Text variant="caption" numberOfLines={1}>
          {card.name} · {card.localId}
        </Text>
        <SegmentedControl
          options={CONDITION_OPTIONS}
          value={condition}
          compact
          onChange={(next) => onChange(card.id, next)}
        />
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    gap: spacing.md,
    paddingTop: spacing.md,
    paddingHorizontal: spacing.lg,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    borderTopWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  options: {
    gap: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  thumbnail: {
    width: CARD_THUMBNAIL_WIDTH,
  },
  rowContent: {
    flex: 1,
    gap: spacing.xs,
  },
  links: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  secondaryAction: {
    flex: 2,
  },
  primaryAction: {
    flex: 3,
  },
});
