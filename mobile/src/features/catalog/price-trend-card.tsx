import type { PriceTrend } from '@collection/shared';
import type { TFunction } from 'i18next';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatEuros } from '@/lib/format';
import { AreaChart, Chip, Text, colors, radius, spacing, type ChartPoint } from '@/ui';

/** Chart points from oldest to newest. Missing averages are skipped. */
function chartPoints(trend: PriceTrend, t: TFunction): ChartPoint[] {
  const points: (ChartPoint | undefined)[] = [
    trend.avg30 ? { label: t('priceTrend.days30'), value: trend.avg30 } : undefined,
    trend.avg7 ? { label: t('priceTrend.days7'), value: trend.avg7 } : undefined,
    trend.avg1 ? { label: t('priceTrend.days1'), value: trend.avg1 } : undefined,
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
  const { t } = useTranslation();
  const [selectedVariant, setSelectedVariant] = useState(trends[0]?.variant);
  const trend = trends.find((entry) => entry.variant === selectedVariant) ?? trends[0];
  // Same points from one render to the next, so the chart only replays its animation when the trend changes.
  const points = useMemo(() => (trend ? chartPoints(trend, t) : []), [trend, t]);

  if (!trend) {
    return (
      <View style={styles.card}>
        <Text variant="overline" tone="muted">
          {t('priceTrend.title')}
        </Text>
        <Text tone="muted">{t('priceTrend.noSales')}</Text>
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
            {t('priceTrend.title')}
          </Text>
          <Text variant="title">{formatEuros(trend.trend ?? points.at(-1)!.value)}</Text>
        </View>
        {delta !== undefined && (
          <View style={[styles.badge, { backgroundColor: rising ? colors.successSoft : colors.dangerSoft }]}>
            <Text variant="caption" style={{ color: lineColor }}>
              {t('priceTrend.change', {
                arrow: rising ? '▲' : '▼',
                percent: Math.abs(Math.round(delta * 100)),
                period,
              })}
            </Text>
          </View>
        )}
      </View>

      {trends.length > 1 && (
        <View style={styles.chips}>
          {trends.map((entry) => (
            <Chip
              key={entry.variant}
              label={t(`variants.${entry.variant}`)}
              selected={entry.variant === trend.variant}
              onPress={() => setSelectedVariant(entry.variant)}
            />
          ))}
        </View>
      )}

      {points.length > 1 && (
        <AreaChart key={trend.variant} points={points} color={lineColor} formatValue={formatEuros} />
      )}

      <View style={styles.stats}>
        <Stat label={t('priceTrend.trend')} value={trend.trend} />
        <Stat label={t('priceTrend.low')} value={trend.low} />
        <Stat label={t('priceTrend.avg30')} value={trend.avg30} />
        <Stat label={t('priceTrend.avg7')} value={trend.avg7} />
        <Stat label={t('priceTrend.avg1')} value={trend.avg1} />
      </View>

      <Text variant="caption" tone="faint">
        {t('priceTrend.notice')}
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
