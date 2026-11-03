import { ScrollView, StyleSheet } from 'react-native';

import { DeleteAccountSection, TwoFactorSection } from '@/features/account/account-security-sections';
import { useAccount, useHasPassword } from '@/features/account/use-account';
import { StateView, colors, spacing } from '@/ui';

/** Security of the account, meaning two-factor authentication and account deletion. */
export default function SecurityScreen() {
  const { user } = useAccount();
  const { hasPassword, failed, retry } = useHasPassword();

  if (failed) {
    return (
      <StateView
        title="Compte indisponible"
        message="Vérifie ta connexion, puis réessaie."
        actionLabel="Réessayer"
        onAction={retry}
      />
    );
  }
  if (!user || hasPassword === undefined) return <StateView loading />;

  const twoFactorEnabled = Boolean(user.twoFactorEnabled);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <TwoFactorSection hasPassword={hasPassword} enabled={twoFactorEnabled} />
      <DeleteAccountSection userId={user.id} hasPassword={hasPassword} twoFactorEnabled={twoFactorEnabled} />
    </ScrollView>
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
