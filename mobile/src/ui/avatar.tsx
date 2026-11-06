import { Image } from 'expo-image';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Text } from './text';
import { colors } from './theme';

interface AvatarProps {
  name: string;
  uri?: string;
  size?: number;
}

/** Round profile picture, or the first letter of the name when there is none. */
export function Avatar({ name, uri, size = 56 }: AvatarProps) {
  const { t } = useTranslation();
  const circle = { width: size, height: size, borderRadius: size / 2 };
  if (uri) {
    return <Image accessibilityLabel={t('account.photo')} source={{ uri }} contentFit="cover" cachePolicy="memory" style={circle} />;
  }
  return (
    <View style={[styles.initial, circle]}>
      <Text variant="heading" style={{ color: colors.accentText, fontSize: size * 0.42, lineHeight: size * 0.5 }}>
        {name.trim().charAt(0).toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  initial: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.accent,
  },
});
