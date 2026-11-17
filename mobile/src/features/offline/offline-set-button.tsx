import type { CardSet } from '@collection/shared';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSettings } from '@/features/settings/settings-provider';
import { formatDay } from '@/lib/format';
import { Button, ProgressBar, Text, spacing } from '@/ui';

import { OFFLINE_FILES_AVAILABLE } from './catalog-files';
import { downloadSets, useOfflineDownloads } from './offline-downloads';

/** Keeps a set on the phone, and says whether it already is. */
export function OfflineSetButton({ set }: { set: CardSet }) {
  const { t } = useTranslation();
  const { catalogLanguage: language } = useSettings();
  const { downloaded, current, waiting } = useOfflineDownloads();
  if (!OFFLINE_FILES_AVAILABLE) return null;

  const keep = () => void downloadSets(language, [set.id]);
  const keptOn = downloaded[language]?.[set.id];

  if (current?.language === language && current.setId === set.id) {
    return (
      <View style={styles.status}>
        <Text variant="caption" tone="muted">
          {t('offline.progress', { name: set.name, done: current.done, total: current.total })}
        </Text>
        <ProgressBar ratio={current.total > 0 ? current.done / current.total : 0} />
      </View>
    );
  }
  if (waiting.some((entry) => entry.language === language && entry.setId === set.id)) {
    return (
      <Text variant="caption" tone="muted">
        {t('offline.setWaiting')}
      </Text>
    );
  }
  if (keptOn) {
    return (
      <View style={styles.kept}>
        <Text variant="caption" tone="muted" style={styles.keptText}>
          {t('offline.setKept', { day: formatDay(keptOn) })}
        </Text>
        <Button label={t('offline.refreshSet')} variant="secondary" onPress={keep} />
      </View>
    );
  }
  return <Button label={t('offline.keepSet')} variant="secondary" onPress={keep} />;
}

const styles = StyleSheet.create({
  status: {
    gap: spacing.xs,
  },
  kept: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  keptText: {
    flex: 1,
  },
});
