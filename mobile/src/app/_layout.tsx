import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { CollectionProvider } from '@/features/collection/collection-provider';
import { WishlistProvider } from '@/features/wishlist/wishlist-provider';
import { SettingsProvider } from '@/features/settings/settings-provider';
import { colors } from '@/ui';

SplashScreen.preventAutoHideAsync();

const navigationTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: colors.background,
    card: colors.background,
    text: colors.text,
    border: colors.border,
    primary: colors.accent,
  },
};

/** App root that wires the theme, settings, collection and navigation. */
export default function RootLayout() {
  useEffect(() => {
    SplashScreen.hideAsync();
  }, []);

  return (
    <ThemeProvider value={navigationTheme}>
      <StatusBar style="light" />
      <SettingsProvider>
        <CollectionProvider>
          <WishlistProvider>
            <Stack
              screenOptions={{
                headerTintColor: colors.text,
                headerStyle: { backgroundColor: colors.background },
                headerShadowVisible: false,
                headerBackButtonDisplayMode: 'minimal',
                contentStyle: { backgroundColor: colors.background },
              }}>
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen name="set/[setId]" options={{ title: '' }} />
              <Stack.Screen name="card/[cardId]" options={{ title: '' }} />
            </Stack>
          </WishlistProvider>
        </CollectionProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
