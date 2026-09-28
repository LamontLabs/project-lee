import { NativeModules, Platform } from 'react-native';

export type ScreenObservationSample = {
  contentBase64: string;
  mimeType: 'image/png';
  byteSize: number;
  filename: string;
  capturedAt: string;
};

type LeeScreenCaptureModule = {
  requestPermission?: () => Promise<boolean>;
  captureSample?: () => Promise<ScreenObservationSample>;
  stop?: () => Promise<void>;
};

function nativeModule() {
  return Platform.OS === 'android'
    ? NativeModules.LeeScreenCapture as LeeScreenCaptureModule | undefined
    : undefined;
}

export function requestScreenObservationPermission() {
  return nativeModule()?.requestPermission?.() ?? Promise.resolve(false);
}

export function captureScreenObservationSample() {
  const module = nativeModule();
  return module?.captureSample?.() ?? Promise.reject(new Error('Android screen observation is unavailable on this platform.'));
}

export function stopScreenObservation() {
  return nativeModule()?.stop?.() ?? Promise.resolve();
}