import { useFonts } from 'expo-font';
import { ArchivoBlack_400Regular } from '@expo-google-fonts/archivo-black';
import {
  IBMPlexSans_400Regular,
  IBMPlexSans_500Medium,
  IBMPlexSans_700Bold,
} from '@expo-google-fonts/ibm-plex-sans';
import {
  IBMPlexSansArabic_400Regular,
  IBMPlexSansArabic_700Bold,
} from '@expo-google-fonts/ibm-plex-sans-arabic';
import { IBMPlexMono_400Regular } from '@expo-google-fonts/ibm-plex-mono';
import { fonts } from './tokens';

/**
 * Charge les polices du design system et les mappe sur les noms de tokens
 * (fonts.*), pour que les composants restent découplés des packages sources.
 */
export function useAppFonts(): boolean {
  const [loaded] = useFonts({
    [fonts.display]: ArchivoBlack_400Regular,
    [fonts.sans]: IBMPlexSans_400Regular,
    [fonts.sansMedium]: IBMPlexSans_500Medium,
    [fonts.sansBold]: IBMPlexSans_700Bold,
    [fonts.arabic]: IBMPlexSansArabic_400Regular,
    [fonts.arabicBold]: IBMPlexSansArabic_700Bold,
    [fonts.mono]: IBMPlexMono_400Regular,
  });
  return loaded;
}
