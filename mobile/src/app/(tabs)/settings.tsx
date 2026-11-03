import { LANGUAGES, LANGUAGE_LABELS } from '@collection/shared';
import { router } from 'expo-router';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authClient } from '@/features/account/auth-client';
import { useAccount } from '@/features/account/use-account';
import { useSettings } from '@/features/settings/settings-provider';
import { Button, Chip, Text, WEB_TAB_BAR_OFFSET, colors, radius, spacing } from '@/ui';

/** Settings screen with the account, the catalog language and the legal notice. */
export default function SettingsScreen() {
  const { language, setLanguage } = useSettings();
  const { user } = useAccount();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="display">Réglages</Text>

        <View style={styles.section}>
          <Text variant="heading">Compte</Text>
          {user ? (
            <>
              <Text>{user.name}</Text>
              <Text variant="caption" tone="muted">
                {user.email}
              </Text>
              <View style={styles.accountActions}>
                <Button label="Mon compte et sécurité" variant="secondary" onPress={() => router.push('/account/security')} />
                <Button label="Se déconnecter" variant="secondary" onPress={() => authClient.signOut()} />
              </View>
            </>
          ) : (
            <>
              <Text variant="caption" tone="muted">
                Connecte-toi pour commencer ta collection et tes envies.
              </Text>
              <Button label="Se connecter" onPress={() => router.push('/sign-in')} />
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="heading">Langue du catalogue</Text>
          <Text variant="caption" tone="muted">
            Noms et aperçus des cartes. La langue de tes exemplaires ne change pas.
          </Text>
          <View style={styles.chips}>
            {LANGUAGES.map((l) => (
              <Chip key={l} label={LANGUAGE_LABELS[l]} selected={l === language} onPress={() => setLanguage(l)} />
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="heading">Confidentialité</Text>
          <Text variant="caption" tone="muted">
            Ce que l’application enregistre, pourquoi, et tes droits.
          </Text>
          <View style={styles.accountActions}>
            <Button label="Politique de confidentialité" variant="secondary" onPress={() => router.push('/privacy')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="heading">À propos</Text>
          <Text variant="caption" tone="muted">
            Application non officielle. Les cartes Pokémon et leurs images appartiennent à The Pokémon Company. Données
            du catalogue : TCGdex. Prix : moyennes Cardmarket, indicatives.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: spacing.lg,
    paddingTop: WEB_TAB_BAR_OFFSET + spacing.lg,
    gap: spacing.lg,
  },
  section: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  chips: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  accountActions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
