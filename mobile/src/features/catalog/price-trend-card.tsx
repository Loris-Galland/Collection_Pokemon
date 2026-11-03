import { VARIANT_LABELS, type PriceTrend } from '@collection/shared';
import { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { formatEuros } from '@/lib/format';
import { AreaChart, Chip, Text, colors, radius, spacing, type ChartPoint } from '@/ui';

/** Chart points from oldest to newest. Missing averages are skipped. */
function chartPoints(trend: PriceTrend): ChartPoint[] {
  const points: (ChartPoint | undefined)[] = [
    trend.avg30 ? { label: '30 j', value: trend.avg30 } : undefined,
    trend.avg7 ? { label: '7 j', value: trend.avg7 } : undefined,
    trend.avg1 ? { label: '1 j', value: trend.avg1 } : undefined,
  ];
  return points.filter((point) => point !== undefined);
}

/** Change between the oldest and the most recent average, as a ratio. */
function change(points: readonly ChartPoint[]): number | undefined {
  const first = points[0];
  const last = points.at(-1);
  if (!first || !last || points.length < 2) return undefined;
  return (last.value - first.value) / first.value;
}

/**
 * Price trend of a card in the style of Cardmarket. Shows the 30, 7 and 1 day averages as a curve, then the key
 * figures.
 */
export function PriceTrendCard({ trends }: { trends: readonly PriceTrend[] }) {
  const [selectedVariant, setSelectedVariant] = useState(trends[0]?.variant);
  const trend = trends.find((t) => t.variant === selectedVariant) ?? trends[0];
  // Same points from one render to the next, so the chart only replays its animation when the trend changes.
  const points = useMemo(() => (trend ? chartPoints(trend) : []), [trend]);

  if (!trend) {
    return (
      <View style={styles.card}>
        <Text variant="overline" tone="muted">
          Tendance du prix
        </Text>
        <Text tone="muted">Pas encore de ventes suivies sur Cardmarket pour cette carte.</Text>
      </View>
    );
  }

  const delta = change(points);
  // The change covers the oldest available average, which is 30 days, or 7 days when the first one is missing.
  const period = points[0]?.label;
  const rising = delta !== undefined && delta >= 0;
  const lineColor = delta === undefined ? colors.accent : rising ? colors.success : colors.danger;

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headline}>
          <Text variant="overline" tone="muted">
            Tendance du prix
          </Text>
          <Text variant="title">{formatEuros(trend.trend ?? points.at(-1)!.value)}</Text>
        </View>
        {delta !== undefined && (
          <View style={[styles.badge, { backgroundColor: rising ? colors.successSoft : colors.dangerSoft }]}>
            <Text variant="caption" style={{ color: lineColor }}>
              {rising ? '▲' : '▼'} {Math.abs(Math.round(delta * 100))} % sur {period}
            </Text>
          </View>
        )}
      </View>

      {trends.length > 1 && (
        <View style={styles.chips}>
          {trends.map((t) => (
            <Chip
              key={t.variant}
              label={VARIANT_LABELS[t.variant]}
              selected={t.variant === trend.variant}
              onPress={() => setSelectedVariant(t.variant)}
            />
          ))}
        </View>
      )}

      {points.length > 1 && (
        <AreaChart key={trend.variant} points={points} color={lineColor} formatValue={formatEuros} />
      )}

      <View style={styles.stats}>
        <Stat label="Tendance" value={trend.trend} />
        <Stat label="Prix le plus bas" value={trend.low} />
        <Stat label="Moyenne 30 j" value={trend.avg30} />
        <Stat label="Moyenne 7 j" value={trend.avg7} />
        <Stat label="Moyenne 1 j" value={trend.avg1} />
      </View>

      <Text variant="caption" tone="faint">
        Ce n’est pas un historique jour par jour : la courbe relie les moyennes des ventes Cardmarket sur 30, 7 et 1
        jour(s), toutes langues et tous états confondus. Prix indicatifs, pas des prix de vente réels.
      </Text>
    </View>
  );
}

function Stat({ label, value }: { label: string; value: number | undefined }) {
  return (
    <View style={styles.stat}>
      <Text variant="caption" tone="muted">
        {label}
      </Text>
      <Text variant="heading" tone={value ? 'default' : 'faint'}>
        {value ? formatEuros(value) : '—'}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.lg,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: colors.border,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  headline: {
    gap: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  stats: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: spacing.md,
  },
  stat: {
    width: '50%',
    gap: 2,
  },
});
