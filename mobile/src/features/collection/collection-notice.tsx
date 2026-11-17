import { useTranslation } from 'react-i18next';

import { SyncNotice } from '@/ui';

import { useCollectionSaveError, useUnsentCount } from './collection-provider';
import type { SaveFailure } from './collection-source';

const SAVE_ERROR_MESSAGES = {
  full: 'collection.saveFull',
  'signed-out': 'collection.saveSignedOut',
  other: 'collection.saveFailed',
} as const satisfies Record<SaveFailure, string>;

/** Tells the user why the last change was undone, or how many changes wait for the network. */
export function CollectionNotice() {
  const { t } = useTranslation();
  const unsentCount = useUnsentCount();
  const { saveError, dismiss } = useCollectionSaveError();
  return (
    <SyncNotice
      error={saveError && t(SAVE_ERROR_MESSAGES[saveError])}
      pending={unsentCount > 0 ? t('collection.unsent', { count: unsentCount }) : undefined}
      onDismiss={dismiss}
    />
  );
}
