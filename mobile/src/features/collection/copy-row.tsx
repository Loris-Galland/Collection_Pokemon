import { CONDITION_LABELS, type Copy } from '@collection/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Stepper, Text, colors, radius, spacing } from '@/ui';

import { useCollectionActions, useCollectionStatus } from './collection-provider';

/** An owned copy with an editable quantity. Setting it to 0 removes the copy. */
export function CopyRow({ copy }: { copy: Copy }) {
  const { t } = useTranslation();
  const { setQuantity } = useCollectionActions();
  const readOnly = useCollectionStatus() === 'read-only';
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text variant="heading">{t(`variants.${copy.variant}`)}</Text>
        <Text variant="caption" tone="muted">
          {t(`languages.${copy.language}`)} · {CONDITION_LABELS[copy.condition]}
        </Text>
      </View>
      <Stepper value={copy.quantity} disabled={readOnly} onChange={(quantity) => setQuantity(copy.id, quantity)} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  body: {
    flex: 1,
    gap: 2,
  },
});
