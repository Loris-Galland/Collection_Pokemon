import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, View } from 'react-native';

import { Text, colors, radius, spacing } from '@/ui';

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text variant="heading">{title}</Text>
      {children}
    </View>
  );
}

function Paragraph({ children }: { children: ReactNode }) {
  return (
    <Text variant="caption" tone="muted">
      {children}
    </Text>
  );
}

/** Privacy policy, meaning what the app collects, why, for how long, and the rights of the user. */
export default function PrivacyScreen() {
  const { t } = useTranslation();
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="display">{t('privacy.title')}</Text>

      <Section title={t('privacy.controllerTitle')}>
        <Paragraph>{t('privacy.controller')}</Paragraph>
      </Section>

      <Section title={t('privacy.dataTitle')}>
        <Paragraph>{t('privacy.dataAccount')}</Paragraph>
        <Paragraph>{t('privacy.dataPhoto')}</Paragraph>
        <Paragraph>{t('privacy.dataSecurity')}</Paragraph>
        <Paragraph>{t('privacy.dataSessions')}</Paragraph>
        <Paragraph>{t('privacy.dataCounters')}</Paragraph>
        <Paragraph>{t('privacy.dataCollection')}</Paragraph>
        <Paragraph>{t('privacy.dataWishes')}</Paragraph>
      </Section>

      <Section title={t('privacy.whyTitle')}>
        <Paragraph>{t('privacy.why')}</Paragraph>
      </Section>

      <Section title={t('privacy.howLongTitle')}>
        <Paragraph>{t('privacy.howLongAccount')}</Paragraph>
        <Paragraph>{t('privacy.howLongPhoto')}</Paragraph>
        <Paragraph>{t('privacy.howLongCollection')}</Paragraph>
        <Paragraph>{t('privacy.howLongSessions')}</Paragraph>
        <Paragraph>{t('privacy.howLongAttempts')}</Paragraph>
      </Section>

      <Section title={t('privacy.whoTitle')}>
        <Paragraph>{t('privacy.whoHosting')}</Paragraph>
        <Paragraph>{t('privacy.whoGoogle')}</Paragraph>
        <Paragraph>{t('privacy.whoTcgdex')}</Paragraph>
        <Paragraph>{t('privacy.whoImages')}</Paragraph>
      </Section>

      <Section title={t('privacy.ageTitle')}>
        <Paragraph>{t('privacy.age')}</Paragraph>
      </Section>

      <Section title={t('privacy.rightsTitle')}>
        <Paragraph>{t('privacy.rights')}</Paragraph>
        <Paragraph>{t('privacy.rightsInApp')}</Paragraph>
        <Paragraph>{t('privacy.rightsCnil')}</Paragraph>
      </Section>

      <Paragraph>{t('privacy.updated')}</Paragraph>
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
    paddingBottom: spacing.xxl,
  },
  section: {
    gap: spacing.sm,
    padding: spacing.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
});
