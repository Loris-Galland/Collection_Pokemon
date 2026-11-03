import type { ReactNode } from 'react';
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
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text variant="display">Confidentialité</Text>

      <Section title="Responsable du traitement">
        <Paragraph>Loris, éditeur de l’application Holo, projet personnel et non commercial.</Paragraph>
      </Section>

      <Section title="Ce que nous enregistrons">
        <Paragraph>
          Ton compte : e-mail, pseudo et mot de passe haché (il n’est jamais conservé en clair), ou ton nom et ton e-mail
          si tu utilises Google.
        </Paragraph>
        <Paragraph>
          Ta photo de profil, si tu en ajoutes une : une version réduite, sans ses métadonnées, conservée sur notre serveur
          et visible seulement par toi.
        </Paragraph>
        <Paragraph>
          Ta sécurité : le secret et les codes de secours de la validation en deux étapes, sous forme chiffrée.
        </Paragraph>
        <Paragraph>
          Tes connexions : l’adresse IP et le type d’appareil de chaque session, et l’adresse IP des tentatives de
          connexion.
        </Paragraph>
        <Paragraph>
          Ta collection et tes envies : elles restent pour l’instant sur ton téléphone et ne nous sont pas envoyées.
        </Paragraph>
      </Section>

      <Section title="Pourquoi">
        <Paragraph>
          Pour te fournir le service que tu demandes en créant un compte (exécution du contrat), et pour protéger les
          comptes contre les accès frauduleux (intérêt légitime). Nous n’utilisons ni publicité, ni revente, ni outil de
          suivi.
        </Paragraph>
      </Section>

      <Section title="Combien de temps">
        <Paragraph>Ton compte : jusqu’à ce que tu le supprimes.</Paragraph>
        <Paragraph>Ta photo de profil : jusqu’à ce que tu la retires ou que tu supprimes ton compte.</Paragraph>
        <Paragraph>Tes sessions : elles expirent après 7 jours sans utilisation, puis sont effacées.</Paragraph>
        <Paragraph>Les tentatives de connexion : 48 heures au plus.</Paragraph>
      </Section>

      <Section title="Qui y a accès">
        <Paragraph>
          Vercel (serveur) et MongoDB Atlas (base de données), configurés pour héberger les données à Paris. Ces
          entreprises sont américaines, et un accès depuis les États-Unis ne peut pas être totalement exclu.
        </Paragraph>
        <Paragraph>Google, seulement si tu choisis de te connecter avec Google.</Paragraph>
        <Paragraph>
          TCGdex, qui fournit le catalogue et les images : ce service reçoit l’adresse IP de ton téléphone quand tu
          parcours les cartes.
        </Paragraph>
        <Paragraph>
          pokemontcg.io et Scrydex, qui fournissent les images absentes de TCGdex : ces services reçoivent aussi l’adresse IP
          de ton téléphone quand une de ces images s’affiche.
        </Paragraph>
      </Section>

      <Section title="Âge minimum">
        <Paragraph>
          Il faut avoir au moins 15 ans pour créer un compte. En dessous, l’accord d’un parent est nécessaire et le
          catalogue reste consultable sans compte.
        </Paragraph>
      </Section>

      <Section title="Tes droits">
        <Paragraph>
          Tu peux accéder à tes données, les rectifier, les effacer, les récupérer, t’opposer à leur traitement ou en
          demander la limitation.
        </Paragraph>
        <Paragraph>
          Dans Réglages, puis Mon compte, tu peux modifier ton pseudo et ta photo, exporter tes données et supprimer ton
          compte.
        </Paragraph>
        <Paragraph>Tu peux aussi adresser une réclamation à la CNIL (cnil.fr).</Paragraph>
      </Section>

      <Paragraph>Dernière mise à jour : 3 novembre 2026.</Paragraph>
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
