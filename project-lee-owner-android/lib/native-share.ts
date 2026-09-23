import { DeviceEventEmitter, NativeModules, Platform } from 'react-native';
import type { AndroidSystemSharePayload } from './system-share';

const MODULE_NAME = 'LeeShare';
const EVENT_NAME = 'LeeShareReceived';

export function getInitialAndroidShare(): Promise<AndroidSystemSharePayload | null> {
  if (Platform.OS !== 'android') return Promise.resolve(null);
  const module = NativeModules[MODULE_NAME] as { getInitialShare?: () => Promise<AndroidSystemSharePayload | null> } | undefined;
  return module?.getInitialShare?.() ?? Promise.resolve(null);
}

export function subscribeToAndroidShare(listener: (payload: AndroidSystemSharePayload) => void) {
  if (Platform.OS !== 'android') return { remove() {} };
  return DeviceEventEmitter.addListener(EVENT_NAME, listener);
}