import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Share, StyleSheet, View } from 'react-native';

import { useWishlist } from '@/features/wishlist/wishlist-provider';
import { Button, Text, TextField, colors, radius, spacing } from '@/ui';

import { authClient } from './auth-client';
import { AvatarPicker } from './avatar-picker';
import { fetchAccountExport } from './export-api';
import { FormError } from './form-error';
import { useAccountRequest } from './use-account-request';

interface ProfileUser {
  id: string;
  name: string;
  email: string;
  createdAt: Date;
  twoFactorEnabled?: boolean | null;
}

/** Changes the pseudo. The email stays fixed until addresses can be verified by email. */
export function ProfileSection({ user }: { user: ProfileUser }) {
  const { t } = useTranslation();
  const [name, setName] = useState(user.name);
  const [saved, setSaved] = useState(false);
  const { error, busy, send } = useAccountRequest();

  const trimmed = name.trim();
  const save = () => {
    setSaved(false);
    return send(
      () => authClient.updateUser({ name: trimmed }),
      () => setSaved(true),
    );
  };

  return (
    <View style={styles.section}>
      <Text variant="heading">{t('account.profile')}</Text>
      <AvatarPicker userId={user.id} name={user.name} />
      <Text variant="caption" tone="muted">
        {user.email}
      </Text>
      <TextField
        label={t('account.pseudo')}
        value={name}
        onChangeText={(value) => {
          setName(value);
          setSaved(false);
        }}
        autoCapitalize="words"
        autoComplete="username"
        textContentType="username"
      />
      <FormError message={error} />
      {saved && (
        <Text variant="caption" style={{ color: colors.success }}>
          {t('account.pseudoSaved')}
        </Text>
      )}
      <Button
        label={busy ? t('common.wait') : t('common.save')}
        variant="secondary"
        disabled={busy || !trimmed || trimmed === user.name}
        onPress={save}
      />
    </View>
  );
}

/**
 * Gives the user a copy of their data, as JSON, through the share sheet of the phone. It comes from the server, so it
 * holds everything kept there, and the wishes are added from the phone, where they still live.
 */
export function ExportSection() {
  const { t } = useTranslation();
  const { wishlists, wishes } = useWishlist();
  const [failed, setFailed] = useState(false);
  const [busy, setBusy] = useState(false);

  const exportData = async () => {
    setFailed(false);
    setBusy(true);
    try {
      const data = {
        exportedAt: new Date().toISOString(),
        ...(await fetchAccountExport()),
        wishlists,
        wishes,
      };
      await Share.share({ title: t('account.exportTitle'), message: JSON.stringify(data, null, 2) });
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  };

  return (
    <View style={styles.section}>
      <Text variant="heading">{t('account.myData')}</Text>
      <Text variant="caption" tone="muted">
        {t('account.exportText')}
      </Text>
      {failed && <FormError message={t('account.exportFailed')} />}
      <Button
        label={busy ? t('common.wait') : t('account.export')}
        variant="secondary"
        disabled={busy}
        onPress={exportData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.md,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
