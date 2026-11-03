import {
  CONDITIONS,
  CONDITION_ABBREVIATIONS,
  CONDITION_LABELS,
  DEFAULT_CONDITION,
  LANGUAGES,
  LANGUAGE_LABELS,
  VARIANT_LABELS,
  pickVariant,
  type Card,
  type Condition,
  type Language,
  type Variant,
} from '@collection/shared';
import { memo, useCallback, useState } from 'react';
import { FlatList, Pressable, StyleSheet, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useRequireAccount } from '@/features/account/use-account';
import { CardImage } from '@/features/catalog/card-image';
import { loadCards } from '@/features/catalog/hooks';
import { useSettings } from '@/features/settings/settings-provider';
import { Button, Chip, SegmentedControl, Text, colors, radius, spacing } from '@/ui';

import { Field } from './add-copy-form';
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

const cardsLabel = (count: number) => `${count} carte${count > 1 ? 's' : ''}`;

/** Bar under a selection of cards, which adds them all at once with one language and a condition for each card. */
export function BulkAddPanel({ selected, onCancel, onSelectMissing, onDone }: BulkAddPanelProps) {
  const { add } = useCollectionActions();
  const requireAccount = useRequireAccount();
  const settings = useSettings();
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preferredVariant, setPreferredVariant] = useState<Variant>('normal');
  const [language, setLanguage] = useState<Language>(settings.language);
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
      setBusy(true);
      // The variants of a card are only known once the card itself is loaded.
      const details = await loadCards(settings.language, selected.map((card) => card.id));
      const failedIds: string[] = [];
      let addedCount = 0;
      for (const card of selected) {
        const detail = details.get(card.id);
        if (!detail) {
          failedIds.push(card.id);
          continue;
        }
        const variant = pickVariant(detail.card.variants, preferredVariant);
        add({ cardId: card.id, setId: card.setId, variant, language, condition: conditionOf(card.id), quantity: 1 });
        addedCount++;
      }
      setBusy(false);
      setOpen(false);
      onDone(addedCount, failedIds);
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
              <Field label="Variante">
                {PREFERRED_VARIANTS.map((v) => (
                  <Chip key={v} label={VARIANT_LABELS[v]} selected={v === preferredVariant} onPress={() => setPreferredVariant(v)} />
                ))}
              </Field>
              <Text variant="caption" tone="faint">
                Une carte qui n’existe pas dans cette variante est ajoutée dans celle qu’elle a.
              </Text>
              <Field label="Langue">
                {LANGUAGES.map((l) => (
                  <Chip key={l} label={LANGUAGE_LABELS[l]} selected={l === language} onPress={() => setLanguage(l)} />
                ))}
              </Field>
              <Field label="État de toutes les cartes">
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
                État carte par carte
              </Text>
            </View>
          }
          renderItem={({ item }) => <CardConditionRow card={item} condition={conditionOf(item.id)} onChange={setCardCondition} />}
        />
      )}
      {open ? (
        <View style={styles.actions}>
          <View style={styles.secondaryAction}>
            <Button label="Retour" variant="secondary" disabled={busy} onPress={() => setOpen(false)} />
          </View>
          <View style={styles.primaryAction}>
            <Button label={busy ? 'Un instant…' : `Ajouter ${cardsLabel(count)}`} disabled={busy} onPress={addAll} />
          </View>
        </View>
      ) : (
        <>
          <View style={styles.links}>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onCancel}>
              <Text variant="caption" tone="muted">
                Annuler
              </Text>
            </Pressable>
            <Pressable accessibilityRole="button" hitSlop={10} onPress={onSelectMissing}>
              <Text variant="caption" tone="accent">
                Toutes les manquantes
              </Text>
            </Pressable>
          </View>
          <Button
            label={count > 0 ? `Continuer (${count})` : 'Touche les cartes à ajouter'}
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
