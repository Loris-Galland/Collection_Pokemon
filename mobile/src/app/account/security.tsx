import { useTranslation } from 'react-i18next';
import { StyleSheet } from 'react-native';

import { DeleteAccountSection, TwoFactorSection } from '@/features/account/account-security-sections';
import { ExportSection, ProfileSection } from '@/features/account/profile-section';
import { useAccount, useHasPassword } from '@/features/account/use-account';
import { KeyboardScrollView, StateView, colors, spacing } from '@/ui';

/** The account, meaning the profile, the data export, two-factor authentication and deletion. */
export default function SecurityScreen() {
  const { t } = useTranslation();
  const { user } = useAccount();
  const { hasPassword, failed, retry } = useHasPassword();

  if (failed) {
    return (
      <StateView
        title={t('account.unavailable')}
        message={t('common.checkConnection')}
        actionLabel={t('common.retry')}
        onAction={retry}
      />
    );
  }
  if (!user || hasPassword === undefined) return <StateView loading />;

  const twoFactorEnabled = Boolean(user.twoFactorEnabled);

  return (
    <KeyboardScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <ProfileSection user={user} />
      <ExportSection />
      <TwoFactorSection hasPassword={hasPassword} enabled={twoFactorEnabled} />
      <DeleteAccountSection userId={user.id} hasPassword={hasPassword} twoFactorEnabled={twoFactorEnabled} />
    </KeyboardScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: colors.background,
  },
  content: {
    width: '100%',
    maxWidth: 560,
    alignSelf: 'center',
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
