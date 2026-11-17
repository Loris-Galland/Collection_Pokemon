import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { useSets } from '@/features/catalog/hooks';
import { useCopies } from '@/features/collection/collection-provider';
import { useSettings } from '@/features/settings/settings-provider';
import { formatSize } from '@/lib/format';
import { Button, ProgressBar, Text, spacing } from '@/ui';

import { OFFLINE_FILES_AVAILABLE } from './catalog-files';
import { cancelDownloads, downloadSets, removeDownloads, useOfflineDownloads } from './offline-downloads';

/** The settings of offline use. The collection works offline anyway, and here the catalog is kept on the phone. */
export function OfflineSection() {
  const { t } = useTranslation();
  const { catalogLanguage: language } = useSettings();
  const { data: sets } = useSets();
  const copies = useCopies();
  const { downloaded, current, waiting, failedCount, size } = useOfflineDownloads();

  const keptCount = Object.keys(downloaded[language] ?? {}).length;
  const busy = current !== undefined || waiting.length > 0;
  const mySetIds = [...new Set(copies.map((copy) => copy.setId))];
  const currentName = current && (sets?.find((set) => set.id === current.setId)?.name ?? current.setId);

  return (
    <View style={styles.section}>
      <Text variant="heading">{t('offline.title')}</Text>
      <Text variant="caption" tone="muted">
        {t('offline.intro')}
      </Text>

      {OFFLINE_FILES_AVAILABLE && (
        <>
          <Text variant="caption">
            {keptCount > 0
              ? t('offline.keptSummary', { count: keptCount, size: formatSize(size) })
              : t('offline.nothingKept')}
          </Text>

          {current && (
            <View style={styles.progress}>
              <Text variant="caption" tone="muted">
                {t('offline.progress', { name: currentName, done: current.done, total: current.total })}
              </Text>
              <ProgressBar ratio={current.total > 0 ? current.done / current.total : 0} />
              {waiting.length > 0 && (
                <Text variant="caption" tone="faint">
                  {t('offline.waiting', { count: waiting.length })}
                </Text>
              )}
            </View>
          )}
          {!busy && failedCount > 0 && (
            <Text variant="caption" tone="muted">
              {t('offline.failed', { count: failedCount })}
            </Text>
          )}

          <View style={styles.actions}>
            {busy ? (
              <Button label={t('offline.stop')} variant="secondary" onPress={cancelDownloads} />
            ) : (
              <>
                {mySetIds.length > 0 && (
                  <Button label={t('offline.keepMine')} onPress={() => void downloadSets(language, mySetIds)} />
                )}
                <Button
                  label={t('offline.keepAll')}
                  variant="secondary"
                  disabled={!sets}
                  onPress={() =>
                    sets &&
                    void downloadSets(
                      language,
                      sets.map((set) => set.id),
                    )
                  }
                />
                <Text variant="caption" tone="faint">
                  {t('offline.keepAllHint')}
                </Text>
                {keptCount > 0 && (
                  <Button label={t('offline.remove')} variant="secondary" onPress={() => void removeDownloads()} />
                )}
              </>
            )}
          </View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  progress: {
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
