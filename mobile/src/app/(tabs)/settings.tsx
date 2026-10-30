import { LANGUAGES, LANGUAGE_LABELS } from '@collection/shared';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSettings } from '@/features/settings/settings-provider';
import { Chip, Text, WEB_TAB_BAR_OFFSET, colors, radius, spacing } from '@/ui';

/** Settings screen with the catalog language and the legal notice. */
export default function SettingsScreen() {
  const { language, setLanguage } = useSettings();

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="display">Réglages</Text>

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
});
