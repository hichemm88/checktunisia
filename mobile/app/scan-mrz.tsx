import { useState } from 'react';
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as ImageManipulator from 'expo-image-manipulator';
import * as Haptics from 'expo-haptics';
import { parseMrzFromText, type MrzResult, type MrzValidation } from '@/lib/mrz';
import { usePendingGuestStore } from '@/stores/pendingGuestStore';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';

/**
 * Passport MRZ capture (§7) — photo-based, like the web. Take a photo OR import one, then
 * read the MRZ with on-device OCR + the same `mrz` parser as the web. To boost accuracy we
 * pre-process the image (like the web crops to the MRZ zone): OCR several focused regions —
 * the bottom band (where the MRZ sits) and the full image — and keep the best result.
 * The image is used in memory only — nothing is uploaded or persisted.
 */

/** Lazy on-device OCR — required only when used so Expo Go (no native module) doesn't crash. */
async function recognizeText(uri: string): Promise<string> {
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const mod = require('@react-native-ml-kit/text-recognition');
  const TextRecognition = mod.default ?? mod;
  const result = await TextRecognition.recognize(uri);
  return (result?.text as string) ?? '';
}

type Crop = { originX: number; originY: number; width: number; height: number };

/** Crop (optional) + upscale a region, then OCR it. */
async function ocrRegion(uri: string, crop: Crop | null): Promise<string> {
  const actions: ImageManipulator.Action[] = [];
  if (crop) actions.push({ crop });
  actions.push({ resize: { width: 1500 } }); // upscale the narrow MRZ band → sharper OCR
  const out = await ImageManipulator.manipulateAsync(uri, actions, {
    compress: 0.9,
    format: ImageManipulator.SaveFormat.JPEG,
  });
  return recognizeText(out.uri);
}

/** How many key fields were extracted — tie-breaker when confidence is equal. */
function fieldScore(r?: MrzResult): number {
  if (!r) return -1;
  return [r.document_number, r.date_of_birth, r.expiry_date, r.last_name, r.nationality_code].filter(
    Boolean,
  ).length;
}

/** Rank a read: checksum confidence first (a valid read beats garbage), then field count. */
function rank(v?: MrzValidation | null): number {
  if (!v?.result) return -1;
  return (v.confidence ?? 0) * 100 + fieldScore(v.result);
}

/** OCR focused regions (MRZ zone first) + the full image; return the best MRZ read. */
async function readMrz(uri: string, w?: number, h?: number): Promise<MrzValidation> {
  const regions: (Crop | null)[] = [];
  if (w && h) {
    const y62 = Math.floor(h * 0.62);
    const y50 = Math.floor(h * 0.5);
    regions.push({ originX: 0, originY: y62, width: w, height: h - y62 }); // bottom third
    regions.push({ originX: 0, originY: y50, width: w, height: h - y50 }); // bottom half
  }
  regions.push(null); // full image

  let best: MrzValidation | null = null;
  for (const crop of regions) {
    try {
      const res = parseMrzFromText(await ocrRegion(uri, crop));
      if (res.ok && res.result) return res; // fully valid → done
      if (res.result && rank(res) > rank(best)) best = res;
    } catch {
      // skip this region
    }
  }
  return best ?? { ok: false, error: fr.scan.notReadable };
}

export default function ScanMrzScreen() {
  const router = useRouter();
  const setGuest = usePendingGuestStore((s) => s.setGuest);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function handleAsset(asset: ImagePicker.ImagePickerAsset) {
    setBusy(true);
    setError('');
    try {
      const res = await readMrz(asset.uri, asset.width, asset.height);
      // Accept a best-effort read (fields extracted) even if not every checksum passed —
      // the mandatory validation screen lets the receptionist correct it (§7).
      if (res.result) {
        void Haptics.notificationAsync(
          res.ok
            ? Haptics.NotificationFeedbackType.Success
            : Haptics.NotificationFeedbackType.Warning,
        );
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
        router.replace('/checkin-manual');
      } else {
        setError(fr.scan.notReadable);
      }
    } catch {
      setError(fr.scan.ocrUnavailable);
    } finally {
      setBusy(false);
    }
  }

  async function takePhoto() {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      setError(fr.scan.permissionBody);
      return;
    }
    const res = await ImagePicker.launchCameraAsync({ quality: 1, allowsEditing: false });
    if (!res.canceled && res.assets[0]) await handleAsset(res.assets[0]);
  }

  async function importPhoto() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError(fr.scan.permissionBody);
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 1 });
    if (!res.canceled && res.assets[0]) await handleAsset(res.assets[0]);
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={fr.common.back}>
          <Ionicons name="chevron-back" size={26} color={colors.encre} />
        </Pressable>
        <Text style={styles.topTitle}>{fr.scan.title}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="document-text-outline" size={44} color={colors.cachet} />
        </View>
        <Text style={styles.instruction}>{fr.scan.photoInstruction}</Text>

        {busy ? (
          <View style={styles.busy}>
            <ActivityIndicator color={colors.cachet} size="large" />
            <Text style={styles.busyText}>{fr.scan.reading}</Text>
          </View>
        ) : (
          <>
            <Pressable style={styles.primaryBtn} onPress={takePhoto}>
              <Ionicons name="camera-outline" size={20} color={colors.blanc} />
              <Text style={styles.primaryText}>{fr.scan.takePhoto}</Text>
            </Pressable>
            <Pressable style={styles.secondaryBtn} onPress={importPhoto}>
              <Ionicons name="image-outline" size={20} color={colors.cachet} />
              <Text style={styles.secondaryText}>{fr.scan.importPhoto}</Text>
            </Pressable>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable style={styles.manualLink} onPress={() => router.replace('/checkin-manual')}>
              <Text style={styles.manualText}>{fr.scan.manualEntry}</Text>
            </Pressable>
          </>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.papier },
  topbar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  topTitle: { fontSize: fontSize.md, fontWeight: fontWeight.bold, color: colors.encre },
  body: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: spacing['2xl'], gap: spacing.lg },
  iconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.cachetDilue,
    alignItems: 'center',
    justifyContent: 'center',
  },
  instruction: { fontSize: fontSize.base, color: colors.fiche, textAlign: 'center', lineHeight: 22 },
  primaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignSelf: 'stretch',
  },
  primaryText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
  secondaryBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cachet,
    borderRadius: radius.btn,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    alignSelf: 'stretch',
  },
  secondaryText: { color: colors.cachet, fontWeight: fontWeight.bold, fontSize: fontSize.md },
  error: { color: colors.danger, fontSize: fontSize.sm, textAlign: 'center' },
  manualLink: { paddingVertical: spacing.md },
  manualText: { color: colors.fiche, fontWeight: fontWeight.semibold, textDecorationLine: 'underline' },
  busy: { alignItems: 'center', gap: spacing.md },
  busyText: { color: colors.fiche, fontSize: fontSize.sm },
});
