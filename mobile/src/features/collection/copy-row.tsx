import { CONDITION_LABELS, VARIANT_LABELS, type Copy } from '@collection/shared';
import { StyleSheet, View } from 'react-native';

import { Stepper, Text, colors, radius, spacing } from '@/ui';

import { useCollectionActions } from './collection-provider';

/** An owned copy with an editable quantity. Setting it to 0 removes the copy. */
export function CopyRow({ copy }: { copy: Copy }) {
  const { setQuantity } = useCollectionActions();
  return (
    <View style={styles.row}>
      <View style={styles.body}>
        <Text variant="heading">{VARIANT_LABELS[copy.variant]}</Text>
        <Text variant="caption" tone="muted">
          {copy.language.toUpperCase()} · {CONDITION_LABELS[copy.condition]}
        </Text>
      </View>
      <Stepper value={copy.quantity} onChange={(quantity) => setQuantity(copy.id, quantity)} />
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
