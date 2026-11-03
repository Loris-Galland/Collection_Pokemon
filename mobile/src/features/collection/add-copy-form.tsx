import {
  CONDITIONS,
  CONDITION_LABELS,
  DEFAULT_CONDITION,
  LANGUAGES,
  LANGUAGE_LABELS,
  VARIANT_LABELS,
  type Card,
  type Condition,
  type Language,
  type Variant,
} from '@collection/shared';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { useRequireAccount } from '@/features/account/use-account';
import { useSettings } from '@/features/settings/settings-provider';
import { Button, Chip, Stepper, Text, colors, radius, spacing } from '@/ui';

import { useCollectionActions } from './collection-provider';

/** Form to add a copy with its variant, language, condition and quantity. */
export function AddCopyForm({ card, onAdded }: { card: Card; onAdded: (quantity: number) => void }) {
  const { add } = useCollectionActions();
  const requireAccount = useRequireAccount();
  const settings = useSettings();
  const [variant, setVariant] = useState<Variant>(card.variants[0] ?? 'normal');
  const [language, setLanguage] = useState<Language>(settings.language);
  const [condition, setCondition] = useState<Condition>(DEFAULT_CONDITION);
  const [quantity, setQuantity] = useState(1);

  const submit = () =>
    requireAccount(() => {
      add({ cardId: card.id, setId: card.setId, variant, language, condition, quantity });
      onAdded(quantity);
      setQuantity(1);
    });

  return (
    <View style={styles.panel}>
      <Field label="Variante">
        {card.variants.map((v) => (
          <Chip key={v} label={VARIANT_LABELS[v]} selected={v === variant} onPress={() => setVariant(v)} />
        ))}
      </Field>
      <Field label="Langue">
        {LANGUAGES.map((l) => (
          <Chip key={l} label={LANGUAGE_LABELS[l]} selected={l === language} onPress={() => setLanguage(l)} />
        ))}
      </Field>
      <Field label="État">
        {CONDITIONS.map((c) => (
          <Chip key={c} label={CONDITION_LABELS[c]} selected={c === condition} onPress={() => setCondition(c)} />
        ))}
      </Field>
      <View style={styles.quantityRow}>
        <Text variant="overline" tone="muted">
          Quantité
        </Text>
        <Stepper value={quantity} min={1} onChange={setQuantity} />
      </View>
      <Button label="Ajouter à ma collection" onPress={submit} />
    </View>
  );
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text variant="overline" tone="muted">
        {label}
      </Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  field: {
    gap: spacing.sm,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});
