import { recentValueChange, type CollectionValue, type ValueTrend } from '@collection/shared';
import { useMemo } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatEuros, formatSignedEuros } from '@/lib/format';
import { AreaChart, Text, colors, radius, spacing, type ChartPoint } from '@/ui';

interface CollectionValueCardProps {
  value: CollectionValue;
  /** Undefined when no copy has a known average. */
  valueTrend: ValueTrend | undefined;
  loading: boolean;
}

/** Small curve of the value trend, then the collection value and its recent change. */
export function CollectionValueCard({ value, valueTrend, loading }: CollectionValueCardProps) {
  // Same points from one render to the next, so the chart only replays its animation when the trend changes.
  const points = useMemo<ChartPoint[]>(
    () =>
      valueTrend
        ? [
            { label: '30 j', value: valueTrend.avg30 },
            { label: '7 j', value: valueTrend.avg7 },
            { label: '1 j', value: valueTrend.avg1 },
          ]
        : [],
    [valueTrend],
  );

  const change = valueTrend && recentValueChange(valueTrend);
  const showTrend = !loading && valueTrend !== undefined && change !== undefined;
  const changeColor = !change ? colors.textMuted : change > 0 ? colors.success : colors.danger;
  const changeBackground = !change ? colors.surfaceRaised : change > 0 ? colors.successSoft : colors.dangerSoft;

  return (
    <View style={styles.card}>
      {showTrend && <AreaChart compact points={points} color={changeColor} height={72} />}

      <View style={styles.headline}>
        <Text variant="overline" tone="muted">
          Valeur de la collection
        </Text>
        <Text variant="display" tone="accent">
          {loading ? '…' : formatEuros(value.amount)}
        </Text>
        {showTrend && (
          <View style={[styles.change, { backgroundColor: changeBackground }]}>
            <Text variant="caption" style={{ color: changeColor }}>
              {change > 0 ? '▲ ' : change < 0 ? '▼ ' : ''}
              {formatSignedEuros(change)} sur 24 h (estimation)
            </Text>
          </View>
        )}
      </View>

      <Text variant="caption" tone="faint">
        Prix moyens Cardmarket, indicatifs : ce ne sont pas des prix de vente réels.
        {showTrend &&
          ' La courbe et l’écart estiment la valeur de tes exemplaires actuels : l’écart compare la moyenne du dernier jour à celle des 7 derniers jours.'}
        {value.unpricedCopyCount > 0 && ` ${value.unpricedCopyCount} exemplaire(s) sans prix, comptés pour 0 €.`}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.xl,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headline: {
    gap: spacing.xs,
    alignItems: 'flex-start',
  },
  change: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
});
