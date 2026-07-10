import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, fontSize, fontWeight, radius } from '@/theme/theme';
import { fr } from '@/i18n/fr';

/**
 * Shown in place of the native MRZ camera when running under Expo Go (where vision-camera
 * isn't available). Keeps the flow usable by routing to manual entry — no crash.
 */
export function ExpoGoScanFallback() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.topbar}>
        <Pressable onPress={() => router.back()} hitSlop={10} accessibilityLabel={fr.common.back}>
          <Ionicons name="close" size={26} color={colors.encre} />
        </Pressable>
        <Text style={styles.topTitle}>{fr.scan.title}</Text>
        <View style={{ width: 26 }} />
      </View>

      <View style={styles.body}>
        <View style={styles.iconCircle}>
          <Ionicons name="scan-outline" size={44} color={colors.cachet} />
        </View>
        <Text style={styles.title}>{fr.scan.title}</Text>
        <Text style={styles.msg}>{fr.scan.unavailable}</Text>

        <Pressable style={styles.cta} onPress={() => router.replace('/checkin-manual')}>
          <Ionicons name="create-outline" size={18} color={colors.blanc} />
          <Text style={styles.ctaText}>{fr.scan.manualEntry}</Text>
        </Pressable>
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
  title: { fontSize: fontSize.xl, fontWeight: fontWeight.black, color: colors.encre },
  msg: { fontSize: fontSize.base, color: colors.fiche, textAlign: 'center', lineHeight: 22 },
  cta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.cachet,
    borderRadius: radius.btn,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    marginTop: spacing.md,
  },
  ctaText: { color: colors.blanc, fontWeight: fontWeight.bold, fontSize: fontSize.md },
});
