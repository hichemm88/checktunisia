import React from 'react';
import { Modal, View, Text, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { colors, spacing, type, radius } from '../theme/tokens';
import { bodyFont } from '../theme/typography';
import { Button } from './Button';

/**
 * « Vérification impossible hors connexion » (F1 / §9.2).
 * Message clair, jamais de résultat basé sur des données périmées.
 */
export const OfflineNotice: React.FC<{ visible: boolean; onClose: () => void }> = ({ visible, onClose }) => {
  const { t } = useTranslation();
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="cloud-offline-outline" size={38} color={colors.vigilanceTexte} />
          </View>
          <Text style={styles.title}>{t('common.offline')}</Text>
          <Text style={styles.body}>{t('common.offlineHint')}</Text>
          <Button label={t('common.close')} variant="secondary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(16,34,46,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  card: {
    width: '100%',
    backgroundColor: colors.papier,
    borderRadius: radius.card,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 68, height: 68, borderRadius: 34,
    backgroundColor: colors.vigilanceFond,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  title: { fontFamily: bodyFont('bold'), fontSize: type.heading, color: colors.encre, textAlign: 'center' },
  body: { fontFamily: bodyFont('regular'), fontSize: type.label, color: colors.fiche, textAlign: 'center', lineHeight: 22, marginBottom: spacing.sm },
});
