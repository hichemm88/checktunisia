import type { ComponentType } from 'react';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { ExpoGoScanFallback } from '@/features/mrz/ExpoGoScanFallback';

/**
 * Route wrapper for the MRZ scanner. vision-camera is a native module absent from Expo Go, so
 * the real camera screen is only *evaluated* (required) outside Expo Go — in Expo Go we render
 * a graceful fallback that routes to manual entry instead of crashing.
 */
const isExpoGo = Constants.executionEnvironment === ExecutionEnvironment.StoreClient;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MrzCameraScreen: ComponentType | null = isExpoGo
  ? null
  : (require('../src/features/mrz/MrzCameraScreen').default as ComponentType);

export default function ScanMrzRoute() {
  if (isExpoGo || !MrzCameraScreen) return <ExpoGoScanFallback />;
  return <MrzCameraScreen />;
}
