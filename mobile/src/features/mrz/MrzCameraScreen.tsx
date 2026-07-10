import { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  Camera,
  useCameraDevice,
  useCameraPermission,
  useFrameProcessor,
} from 'react-native-vision-camera';
import { useTextRecognition } from 'react-native-vision-camera-text-recognition';
import { useRunOnJS } from 'react-native-worklets-core';
import { parseMrzFromText, type MrzValidation } from '@/lib/mrz';
import { usePendingGuestStore } from '@/stores/pendingGuestStore';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';

/**
 * Native MRZ scanner (§7). Real-time OCR via ML Kit (vision-camera text recognition),
 * ICAO 9303 checksum validation BEFORE accepting a result. No document image is stored —
 * frames are processed in memory only.
 *
 * This module statically imports native modules (vision-camera / worklets) that DON'T exist
 * in Expo Go, so it must only ever be required from a dev/standalone build. The route wrapper
 * (app/scan-mrz.tsx) guards that.
 */
export default function MrzCameraScreen() {
  const router = useRouter();
  const setGuest = usePendingGuestStore((s) => s.setGuest);
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice('back');

  const [torch, setTorch] = useState(false);
  const [status, setStatus] = useState('');
  const found = useRef(false);

  // Auto-enable torch after a few seconds without a successful read (low light — §7).
  useEffect(() => {
    const t = setTimeout(() => {
      if (!found.current) setTorch(true);
    }, 4000);
    return () => clearTimeout(t);
  }, []);

  const onText = useCallback(
    (text: string) => {
      if (found.current || !text) return;
      const res: MrzValidation = parseMrzFromText(text);
      if (res.ok && res.result) {
        found.current = true;
        setStatus(fr.scan.success);
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        const r = res.result;
        setGuest({
          first_name: r.first_name,
          last_name: r.last_name,
          date_of_birth: r.date_of_birth,
          sex: r.sex,
          nationality_code: r.nationality_code,
          document_type: 'passport',
          document_number: r.document_number,
          issuing_country_code: r.issuing_country_code,
          expiry_date: r.expiry_date,
        });
        // §7 — mandatory human validation screen after every scan (edit each field).
        setTimeout(() => router.replace('/checkin-manual'), 250);
      } else if (res.error) {
        setStatus(fr.scan.checksumFail);
      }
    },
    [router, setGuest],
  );

  const { scanText } = useTextRecognition({ language: 'latin' });
  // Bridge the recognised text from the frame-processor worklet back to the JS thread.
  const onTextJS = useRunOnJS(onText, [onText]);

  const frameProcessor = useFrameProcessor(
    (frame) => {
      'worklet';
      const results = scanText(frame); // Text[] — each block carries resultText
      let text = '';
      for (const r of results) text += `${r.resultText ?? ''}\n`;
      if (text.trim()) onTextJS(text);
    },
    [onTextJS],
  );

  return (
    <SafeAreaView style={styles.screen} edges={['top', 'bottom']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10}>
          <Ionicons name="close" size={26} color={colors.blanc} />
        </Pressable>
        <Text style={styles.topTitle}>{fr.scan.title}</Text>
        <Pressable onPress={() => setTorch((v) => !v)} hitSlop={10} accessibilityLabel={fr.scan.torch}>
          <Ionicons name={torch ? 'flashlight' : 'flashlight-outline'} size={24} color={colors.blanc} />
        </Pressable>
      </View>

      {!hasPermission ? (
        <Fallback
          title={fr.scan.permissionTitle}
          body={fr.scan.permissionBody}
          ctaLabel={fr.scan.grant}
          onCta={requestPermission}
          onManual={() => router.replace('/checkin-manual')}
        />
      ) : !device ? (
        <Fallback
          title={fr.scan.title}
          body={fr.scan.unavailable}
          onManual={() => router.replace('/checkin-manual')}
        />
      ) : (
        <View style={styles.flex}>
          <Camera
            style={StyleSheet.absoluteFill}
            device={device}
            isActive
            torch={torch ? 'on' : 'off'}
            frameProcessor={frameProcessor}
            pixelFormat={Platform.OS === 'ios' ? 'yuv' : undefined}
          />
          {/* Guide frame */}
          <View style={styles.overlay} pointerEvents="none">
            <View style={styles.guide} />
            <Text style={styles.instruction}>{fr.scan.instruction}</Text>
            {status ? <Text style={styles.status}>{status}</Text> : null}
          </View>
          <Pressable style={styles.manualBtn} onPress={() => router.replace('/checkin-manual')}>
            <Text style={styles.manualText}>{fr.scan.manualEntry}</Text>
          </Pressable>
        </View>
      )}
    </SafeAreaView>
  );
}

function Fallback({
  title,
  body,
  ctaLabel,
  onCta,
  onManual,
}: {
  title: string;
  body: string;
  ctaLabel?: string;
  onCta?: () => void;
  onManual: () => void;
}) {
  return (
    <View style={styles.fallback}>
      <Ionicons name="camera-outline" size={48} color={colors.blanc} />
      <Text style={styles.fbTitle}>{title}</Text>
      <Text style={styles.fbBody}>{body}</Text>
      {ctaLabel && onCta ? (
        <Pressable style={styles.fbCta} onPress={onCta}>
          <Text style={styles.fbCtaText}>{ctaLabel}</Text>
        </Pressable>
      ) : null}
      <Pressable style={styles.fbManual} onPress={onManual}>
        <Text style={styles.fbManualText}>{fr.scan.manualEntry}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#000' },
  flex: { flex: 1 },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    zIndex: 2,
  },
  topTitle: { color: colors.blanc, fontSize: fontSize.md, fontWeight: fontWeight.bold },
  overlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: spacing.lg },
  guide: {
    width: '86%',
    height: 92,
    borderWidth: 2,
    borderColor: colors.cachetSombre,
    borderRadius: radius.input,
    backgroundColor: 'rgba(139,127,224,0.08)',
  },
  instruction: {
    color: colors.blanc,
    fontSize: fontSize.sm,
    textAlign: 'center',
    paddingHorizontal: spacing['2xl'],
  },
  status: {
    color: colors.blanc,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    fontWeight: fontWeight.bold,
  },
  manualBtn: {
    position: 'absolute',
    bottom: spacing['2xl'],
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.btn,
  },
  manualText: { color: colors.blanc, fontWeight: fontWeight.semibold },
  fallback: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.md },
  fbTitle: { color: colors.blanc, fontSize: fontSize.lg, fontWeight: fontWeight.bold, textAlign: 'center' },
  fbBody: { color: 'rgba(255,255,255,0.75)', fontSize: fontSize.sm, textAlign: 'center' },
  fbCta: { backgroundColor: colors.cachet, borderRadius: radius.btn, paddingHorizontal: spacing.xl, paddingVertical: spacing.md, marginTop: spacing.md },
  fbCtaText: { color: colors.blanc, fontWeight: fontWeight.bold },
  fbManual: { paddingVertical: spacing.md },
  fbManualText: { color: colors.cachetSombre, fontWeight: fontWeight.semibold, textDecorationLine: 'underline' },
});
