import { useTranslation } from 'react-i18next';

import { SyncNotice } from '@/ui';

import { useWishlist, useWishlistActions } from './wishlist-provider';

/** Tells the user why a change to the wishes was refused, or how many wait for the network. */
export function WishlistNotice() {
  const { t } = useTranslation();
  const { saveError, unsentCount } = useWishlist();
  const { dismissSaveError } = useWishlistActions();
  return (
    <SyncNotice
      error={saveError && t(`wishlist.saveErrors.${saveError}`)}
      pending={unsentCount > 0 ? t('wishlist.unsent', { count: unsentCount }) : undefined}
      onDismiss={dismissSaveError}
    />
  );
}
