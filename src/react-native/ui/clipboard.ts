import { NativeModules, TurboModuleRegistry } from 'react-native';

let warnedMissingClipboard = false;

function hasCommunityClipboardNativeModule(): boolean {
  try {
    if (TurboModuleRegistry.get('RNCClipboard') != null) {
      return true;
    }
  } catch {
    // TurboModuleRegistry unavailable.
  }

  return NativeModules.RNCClipboard != null;
}

/**
 * Copy text using whichever clipboard peer the host app installed.
 * Checks for the native RNCClipboard module before requiring the community
 * package (its module calls getEnforcing on load and crashes Expo Go).
 * Falls back to expo-clipboard when the community native module is absent.
 */
export async function copyToClipboard(text: string): Promise<void> {
  if (hasCommunityClipboardNativeModule()) {
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require('@react-native-clipboard/clipboard') as {
        default?: { setString: (value: string) => void };
        setString?: (value: string) => void;
      };
      const Clipboard = mod.default ?? mod;
      if (typeof Clipboard.setString === 'function') {
        Clipboard.setString(text);
        return;
      }
    } catch {
      // Native module present but JS package missing or setString failed.
    }
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const ExpoClipboard = require('expo-clipboard') as {
      setStringAsync: (value: string) => Promise<boolean>;
    };
    await ExpoClipboard.setStringAsync(text);
    return;
  } catch {
    // Not installed.
  }

  if (__DEV__ && !warnedMissingClipboard) {
    warnedMissingClipboard = true;
    console.warn(
      '[react-native-in-app-devtools] Install @react-native-clipboard/clipboard (bare RN / Expo development client) or expo-clipboard (Expo Go) to enable Copy.',
    );
  }
}
