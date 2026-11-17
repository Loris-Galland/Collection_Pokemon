import type { ScanMatch } from '@collection/shared';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { File } from 'expo-file-system';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn, FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CardImage } from '@/features/catalog/card-image';
import { useSettings } from '@/features/settings/settings-provider';
import {
  Button,
  CARD_ASPECT_RATIO,
  PokeballLoader,
  PressableScale,
  Text,
  TextField,
  WEB_TAB_BAR_OFFSET,
  colors,
  radius,
  spacing,
} from '@/ui';

import { findScannedCards } from './find-scanned-cards';
import { CAN_READ_TEXT, readTextOnPhoto } from './text-reader';

type ScanState =
  | { step: 'aiming' }
  | { step: 'reading' }
  | { step: 'choosing'; matches: ScanMatch[] }
  | { step: 'not-found'; reason: 'no-number' | 'no-card' | 'failed' };

function forgetPhoto(uri: string): void {
  try {
    const file = new File(uri);
    if (file.exists) file.delete();
  } catch (error) {
    console.warn('Could not remove the scan photo', error);
  }
}

/** Opens the card when there is only one, and lets the user choose otherwise. */
function useShowMatches(setState: (state: ScanState) => void) {
  return (matches: ScanMatch[], numberRead: boolean) => {
    if (matches.length === 1) {
      setState({ step: 'aiming' });
      router.push({ pathname: '/card/[cardId]', params: { cardId: matches[0]!.card.id } });
    } else if (matches.length > 1) {
      setState({ step: 'choosing', matches });
    } else {
      setState({ step: 'not-found', reason: numberRead ? 'no-card' : 'no-number' });
    }
  };
}

/**
 * Scan tab. A photo of the card is read on the phone, the number printed at its bottom finds the card, and its page
 * shows the price and adds it to the collection. The number can also be typed.
 */
export function ScanScreen() {
  const { t } = useTranslation();
  const { catalogLanguage: language } = useSettings();
  const [permission, requestPermission] = useCameraPermissions();
  const camera = useRef<CameraView>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [focused, setFocused] = useState(false);
  const [state, setState] = useState<ScanState>({ step: 'aiming' });
  const [typed, setTyped] = useState('');
  const showMatches = useShowMatches(setState);

  // Only one camera can run at a time, and it should not run behind another tab.
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => {
        setFocused(false);
        setCameraReady(false);
      };
    }, []),
  );

  const search = async (text: string) => {
    setState({ step: 'reading' });
    try {
      const matches = await findScannedCards(language, text);
      showMatches(matches, /\d\s*\/\s*\w/.test(text));
    } catch (error) {
      console.warn('Could not find the scanned card', error);
      setState({ step: 'not-found', reason: 'failed' });
    }
  };

  const takePhoto = async () => {
    if (!camera.current || !cameraReady || state.step === 'reading') return;
    setState({ step: 'reading' });
    try {
      const photo = await camera.current.takePictureAsync({ quality: 0.7, shutterSound: false });
      let text: string;
      try {
        text = await readTextOnPhoto(photo.uri);
      } finally {
        // The photo is only read, never kept.
        forgetPhoto(photo.uri);
      }
      await search(text);
    } catch (error) {
      console.warn('Could not read the photo', error);
      setState({ step: 'not-found', reason: 'failed' });
    }
  };

  const submitTyped = () => {
    const number = typed.trim();
    if (number.length > 0) search(number);
  };

  const showCamera = CAN_READ_TEXT && permission?.granted && focused;

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text variant="display">{t('scan.title')}</Text>
        <Text tone="muted">{CAN_READ_TEXT ? t('scan.intro') : t('scan.introTyping')}</Text>

        {CAN_READ_TEXT && (
          <View style={styles.viewfinder}>
            {showCamera ? (
              <CameraView
                ref={camera}
                style={StyleSheet.absoluteFill}
                facing="back"
                onCameraReady={() => setCameraReady(true)}
              />
            ) : (
              <View style={styles.cameraOff}>
                {permission && !permission.granted && (
                  <>
                    <Text tone="muted" style={styles.centered}>
                      {t('scan.permission')}
                    </Text>
                    <Button label={t('scan.allowCamera')} onPress={requestPermission} />
                  </>
                )}
              </View>
            )}
            <View pointerEvents="none" style={styles.frame}>
              <View style={[styles.corner, styles.topLeft]} />
              <View style={[styles.corner, styles.topRight]} />
              <View style={[styles.corner, styles.bottomLeft]} />
              <View style={[styles.corner, styles.bottomRight]} />
              <View style={styles.numberZone}>
                <Text variant="caption" style={styles.numberHint}>
                  {t('scan.numberHere')}
                </Text>
              </View>
            </View>
            {state.step === 'reading' && (
              <Animated.View entering={FadeIn} style={styles.reading}>
                <PokeballLoader size={56} />
                <Text>{t('scan.reading')}</Text>
              </Animated.View>
            )}
          </View>
        )}

        {CAN_READ_TEXT && showCamera && (
          <View style={styles.shutterRow}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={t('scan.takePhoto')}
              disabled={!cameraReady || state.step === 'reading'}
              onPress={takePhoto}
              style={styles.shutter}>
              <View style={styles.shutterInner} />
            </PressableScale>
          </View>
        )}

        {state.step === 'not-found' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.notice}>
            <Text variant="caption" tone="muted">
              {t(`scan.notFound.${state.reason}`)}
            </Text>
          </Animated.View>
        )}

        {state.step === 'choosing' && (
          <Animated.View entering={FadeInDown.springify()} style={styles.matches}>
            <Text variant="heading">{t('scan.choose', { count: state.matches.length })}</Text>
            {state.matches.map(({ card, set }) => (
              <Pressable
                key={card.id}
                accessibilityRole="button"
                onPress={() => router.push({ pathname: '/card/[cardId]', params: { cardId: card.id } })}
                style={({ pressed }) => [styles.match, pressed && styles.pressed]}>
                <View style={styles.matchImage}>
                  <CardImage imageUrl={card.imageUrl} quality="low" label={card.name} />
                </View>
                <View style={styles.matchText}>
                  <Text variant="heading">{card.name}</Text>
                  <Text variant="caption" tone="muted">
                    {set.name} · {card.localId}/{set.cardCount.official}
                  </Text>
                </View>
              </Pressable>
            ))}
          </Animated.View>
        )}

        <View style={styles.typing}>
          <TextField
            label={t('scan.typeNumber')}
            placeholder="006/165"
            value={typed}
            onChangeText={setTyped}
            onSubmitEditing={submitTyped}
            returnKeyType="search"
            autoCapitalize="characters"
          />
          <Button
            label={t('scan.find')}
            variant={CAN_READ_TEXT ? 'secondary' : 'primary'}
            disabled={typed.trim().length === 0 || state.step === 'reading'}
            onPress={submitTyped}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const CORNER = 28;
const CORNER_WIDTH = 3;

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
  centered: {
    textAlign: 'center',
  },
  viewfinder: {
    width: '100%',
    aspectRatio: 0.82,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraOff: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
  },
  frame: {
    height: '86%',
    aspectRatio: CARD_ASPECT_RATIO,
    justifyContent: 'flex-end',
  },
  corner: {
    position: 'absolute',
    width: CORNER,
    height: CORNER,
    borderColor: colors.accent,
  },
  topLeft: {
    top: 0,
    left: 0,
    borderTopWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderTopLeftRadius: radius.md,
  },
  topRight: {
    top: 0,
    right: 0,
    borderTopWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderTopRightRadius: radius.md,
  },
  bottomLeft: {
    bottom: 0,
    left: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderLeftWidth: CORNER_WIDTH,
    borderBottomLeftRadius: radius.md,
  },
  bottomRight: {
    bottom: 0,
    right: 0,
    borderBottomWidth: CORNER_WIDTH,
    borderRightWidth: CORNER_WIDTH,
    borderBottomRightRadius: radius.md,
  },
  numberZone: {
    margin: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.accent,
    backgroundColor: 'rgba(0, 0, 0, 0.35)',
    alignItems: 'center',
  },
  numberHint: {
    color: colors.text,
  },
  reading: {
    ...StyleSheet.absoluteFill,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    backgroundColor: 'rgba(11, 11, 16, 0.72)',
  },
  shutterRow: {
    alignItems: 'center',
    marginTop: -spacing.sm,
  },
  shutter: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 4,
    borderColor: colors.text,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterInner: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: colors.text,
  },
  notice: {
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  matches: {
    gap: spacing.sm,
  },
  match: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    opacity: 0.7,
  },
  matchImage: {
    width: 56,
  },
  matchText: {
    flex: 1,
    gap: spacing.xs,
  },
  typing: {
    gap: spacing.sm,
  },
});
