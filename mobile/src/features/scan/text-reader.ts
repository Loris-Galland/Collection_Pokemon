import { NativeModules, Platform } from 'react-native';

/**
 * Text recognition runs on the phone with ML Kit, so a photo never leaves it. Expo Go does not include ML Kit, and
 * there the number is typed instead.
 */
export const CAN_READ_TEXT = Platform.OS !== 'web' && NativeModules.TextRecognition != null;

/** The text read on a photo, line after line. Rejects when the photo could not be read. */
export async function readTextOnPhoto(uri: string): Promise<string> {
  const { default: TextRecognition } = await import('@react-native-ml-kit/text-recognition');
  const result = await TextRecognition.recognize(uri);
  return result.blocks.flatMap((block) => block.lines.map((line) => line.text)).join('\n');
}
