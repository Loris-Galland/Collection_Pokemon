import { CATALOG_LANGUAGES, LANGUAGE_NATIVE_NAMES } from '@collection/shared';
import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { authClient } from '@/features/account/auth-client';
import { ProfileButton } from '@/features/account/profile-button';
import { useAccount } from '@/features/account/use-account';
import { useSettings, type AppLanguageChoice } from '@/features/settings/settings-provider';
import { APP_LANGUAGES } from '@/i18n';
import { Button, SelectField, Text, WEB_TAB_BAR_OFFSET, colors, radius, spacing } from '@/ui';

/** Settings screen with the account, the languages and the legal notice. */
export default function SettingsScreen() {
  const { t } = useTranslation();
  const { catalogLanguage, setCatalogLanguage, appLanguage, setAppLanguage } = useSettings();
  const { user } = useAccount();

  const appLanguageOptions = [
    { value: 'system' as AppLanguageChoice, label: t('settings.system') },
    ...APP_LANGUAGES.map((language) => ({
      value: language as AppLanguageChoice,
      label: t(`languages.${language}`),
      detail: LANGUAGE_NATIVE_NAMES[language],
    })),
  ];
  const catalogLanguageOptions = CATALOG_LANGUAGES.map((language) => ({
    value: language,
    label: t(`languages.${language}`),
    detail: LANGUAGE_NATIVE_NAMES[language],
  }));

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text variant="display">{t('settings.title')}</Text>

        <View style={styles.section}>
          <Text variant="heading">{t('settings.account')}</Text>
          {user ? (
            <>
              <View style={styles.identity}>
                <ProfileButton size={56} />
                <View style={styles.identityText}>
                  <Text>{user.name}</Text>
                  <Text variant="caption" tone="muted">
                    {user.email}
                  </Text>
                </View>
              </View>
              <View style={styles.actions}>
                <Button
                  label={t('settings.accountAndSecurity')}
                  variant="secondary"
                  onPress={() => router.push('/account/security')}
                />
                <Button label={t('settings.signOut')} variant="secondary" onPress={() => authClient.signOut()} />
              </View>
            </>
          ) : (
            <>
              <Text variant="caption" tone="muted">
                {t('settings.signInHint')}
              </Text>
              <Button label={t('settings.signIn')} onPress={() => router.push('/sign-in')} />
            </>
          )}
        </View>

        <View style={styles.section}>
          <Text variant="heading">{t('settings.languages')}</Text>
          <SelectField
            label={t('settings.appLanguage')}
            value={appLanguage}
            options={appLanguageOptions}
            onChange={setAppLanguage}
            hint={t('settings.appLanguageHint')}
          />
          <SelectField
            label={t('settings.catalogLanguage')}
            value={catalogLanguage}
            options={catalogLanguageOptions}
            onChange={setCatalogLanguage}
            hint={t('settings.catalogLanguageHint')}
          />
          <Text variant="caption" tone="faint">
            {t('settings.catalogLanguageHint')}
          </Text>
        </View>

        <View style={styles.section}>
          <Text variant="heading">{t('settings.privacy')}</Text>
          <Text variant="caption" tone="muted">
            {t('settings.privacyHint')}
          </Text>
          <View style={styles.actions}>
            <Button label={t('settings.privacyPolicy')} variant="secondary" onPress={() => router.push('/privacy')} />
          </View>
        </View>

        <View style={styles.section}>
          <Text variant="heading">{t('settings.about')}</Text>
          <Text variant="caption" tone="muted">
            {t('settings.aboutText')}
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
  identity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  identityText: {
    flex: 1,
    gap: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
});
