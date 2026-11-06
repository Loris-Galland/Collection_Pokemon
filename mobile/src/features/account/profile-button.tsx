import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, ProfileIcon, colors } from '@/ui';

import { useAvatarUri } from './avatar';
import { useAccount } from './use-account';

function AccountAvatar({ userId, name, size }: { userId: string; name: string; size: number }) {
  return <Avatar name={name} uri={useAvatarUri(userId)} size={size} />;
}

/** Profile picture that opens the account, or the sign in screen for a visitor. */
export function ProfileButton({ size = 40 }: { size?: number }) {
  const { t } = useTranslation();
  const { user } = useAccount();
  const circle = { width: size, height: size, borderRadius: size / 2 };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={user ? t('account.myAccount') : t('account.signIn')}
      hitSlop={8}
      onPress={() => router.push(user ? '/account/security' : '/sign-in')}
      style={({ pressed }) => pressed && styles.pressed}>
      {user ? (
        <AccountAvatar userId={user.id} name={user.name} size={size} />
      ) : (
        <View style={[styles.visitor, circle]}>
          <ProfileIcon color={colors.textMuted} size={size * 0.55} />
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.7,
  },
  visitor: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceRaised,
  },
});
