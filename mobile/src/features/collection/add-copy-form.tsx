import {
  CONDITIONS,
  CONDITION_LABELS,
  DEFAULT_CONDITION,
  LANGUAGES,
  LANGUAGE_NATIVE_NAMES,
  type Card,
  type Condition,
  type Language,
  type Variant,
} from '@collection/shared';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useRequireAccount } from '@/features/account/use-account';
import { useSettings } from '@/features/settings/settings-provider';
import { Button, Chip, SelectField, Stepper, Text, colors, radius, spacing, type SelectOption } from '@/ui';

import { useCollectionActions } from './collection-provider';

/** Every print language, in the app language, with its own name under it. */
export function useLanguageOptions(): SelectOption<Language>[] {
  const { t } = useTranslation();
  return useMemo(
    () =>
      LANGUAGES.map((language) => ({
        value: language,
        label: t(`languages.${language}`),
        detail: LANGUAGE_NATIVE_NAMES[language],
      })),
    [t],
  );
}

/** Form to add a copy with its variant, language, condition and quantity. */
export function AddCopyForm({ card, onAdded }: { card: Card; onAdded: (quantity: number) => void }) {
  const { t } = useTranslation();
  const { add } = useCollectionActions();
  const requireAccount = useRequireAccount();
  const settings = useSettings();
  const languageOptions = useLanguageOptions();
  const [variant, setVariant] = useState<Variant>(card.variants[0] ?? 'normal');
  const [language, setLanguage] = useState<Language>(settings.catalogLanguage);
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
      <Field label={t('addCopy.variant')}>
        {card.variants.map((v) => (
          <Chip key={v} label={t(`variants.${v}`)} selected={v === variant} onPress={() => setVariant(v)} />
        ))}
      </Field>
      <SelectField label={t('addCopy.language')} value={language} options={languageOptions} onChange={setLanguage} />
      <Field label={t('addCopy.condition')}>
        {CONDITIONS.map((c) => (
          <Chip key={c} label={CONDITION_LABELS[c]} selected={c === condition} onPress={() => setCondition(c)} />
        ))}
      </Field>
      <View style={styles.quantityRow}>
        <Text variant="overline" tone="muted">
          {t('addCopy.quantity')}
        </Text>
        <Stepper value={quantity} min={1} onChange={setQuantity} />
      </View>
      <Button label={t('addCopy.submit')} onPress={submit} />
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
