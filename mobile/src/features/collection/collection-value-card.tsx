import {
  dailyValueChange,
  recentValueChange,
  withTodayValue,
  type CollectionValue,
  type DailyValue,
  type ValueTrend,
} from '@collection/shared';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { formatEuros, formatSignedEuros } from '@/lib/format';
import { AMOUNT_LINE_HEIGHT, AreaChart, PokeballLoader, Text, colors, radius, spacing, type ChartPoint } from '@/ui';

interface CollectionValueCardProps {
  value: CollectionValue;
  /** Undefined when no copy has a known average. */
  valueTrend: ValueTrend | undefined;
  loading: boolean;
  /** Snapshots recorded each night by the server, oldest first. Empty for a visitor. */
  history: readonly DailyValue[];
}

/** Today on this phone, formatted as YYYY-MM-DD like the snapshots. */
const today = () => new Intl.DateTimeFormat('en-CA').format(new Date());

const shortDay = (date: string) => `${date.slice(8, 10)}/${date.slice(5, 7)}`;

/**
 * Small curve, then the collection value and how it moved. With snapshots from the server the curve is the value
 * history. Before the second night it is the value trend, an estimate from recent prices.
 */
export function CollectionValueCard({ value, valueTrend, loading, history }: CollectionValueCardProps) {
  const { t } = useTranslation();
  const days = useMemo(
    () => (history.length > 0 ? withTodayValue(history, { date: today(), amount: value.amount }) : []),
    [history, value.amount],
  );
  const showHistory = days.length >= 2;

  // Same points from one render to the next, so the chart only replays its animation when the data changes.
  const points = useMemo<ChartPoint[]>(() => {
    if (showHistory) return days.map((day) => ({ label: shortDay(day.date), value: day.amount }));
    return valueTrend
      ? [
          { label: '30 j', value: valueTrend.avg30 },
          { label: '7 j', value: valueTrend.avg7 },
          { label: '1 j', value: valueTrend.avg1 },
        ]
      : [];
  }, [showHistory, days, valueTrend]);

  const change = showHistory ? dailyValueChange(days) : valueTrend && recentValueChange(valueTrend);
  const showTrend = !loading && change !== undefined;
  const changeColor = !change ? colors.textMuted : change > 0 ? colors.success : colors.danger;
  const changeBackground = !change ? colors.surfaceRaised : change > 0 ? colors.successSoft : colors.dangerSoft;

  return (
    <View style={styles.card}>
      {showTrend && <AreaChart compact points={points} color={changeColor} height={72} />}

      <View style={styles.headline}>
        <Text variant="overline" tone="muted">
          {t('collection.value')}
        </Text>
        {loading ? (
          <PokeballLoader size={AMOUNT_LINE_HEIGHT} />
        ) : (
          <Text variant="display" tone="accent">
            {formatEuros(value.amount)}
          </Text>
        )}
        {showTrend && (
          <View style={[styles.change, { backgroundColor: changeBackground }]}>
            <Text variant="caption" style={{ color: changeColor }}>
              {change > 0 ? '▲ ' : change < 0 ? '▼ ' : ''}
              {t(showHistory ? 'collection.valueSinceYesterday' : 'collection.valueChange', {
                change: formatSignedEuros(change),
              })}
            </Text>
          </View>
        )}
      </View>

      <Text variant="caption" tone="faint">
        {t('collection.valueNotice')}
        {showTrend && t(showHistory ? 'collection.valueHistoryNotice' : 'collection.valueTrendNotice')}
        {value.unpricedCopyCount > 0 && t('collection.unpricedCopies', { count: value.unpricedCopyCount })}
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
