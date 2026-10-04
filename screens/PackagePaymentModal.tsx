import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../lib/theme';

interface PackagePaymentModalProps {
  visible: boolean;
  currentPlan: string;
  currentPlanName: string;
  newPlan: string;
  newPlanName: string;
  isUpgrade: boolean;
  onChoosePaystack: () => Promise<void>;
  onChooseEFT: () => Promise<void>;
  onScheduleDowngrade: () => Promise<void>;
  onClose: () => void;
}

export default function PackagePaymentModal({
  visible,
  currentPlanName,
  newPlanName,
  isUpgrade,
  onChoosePaystack,
  onChooseEFT,
  onScheduleDowngrade,
  onClose,
}: PackagePaymentModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const runAction = async (action: () => Promise<void>, errorMessage: string) => {
    setIsProcessing(true);
    try {
      await action();
    } catch (error: any) {
      Alert.alert('Plan change failed', error?.message || errorMessage);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} disabled={isProcessing}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
        </View>

        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <MaterialIcons
              name={isUpgrade ? 'trending-up' : 'trending-down'}
              size={56}
              color={isUpgrade ? colors.success : colors.warning}
            />
          </View>

          <Text style={styles.title}>{isUpgrade ? 'Upgrade Plan' : 'Downgrade Plan'}</Text>

          <View style={styles.planComparison}>
            <View style={styles.planBox}>
              <Text style={styles.planBoxLabel}>Current</Text>
              <Text style={styles.planBoxValue}>{currentPlanName}</Text>
            </View>

            <MaterialIcons name="arrow-forward" size={24} color={colors.border} />

            <View style={styles.planBox}>
              <Text style={styles.planBoxLabel}>New</Text>
              <Text style={styles.planBoxValue}>{newPlanName}</Text>
            </View>
          </View>

          {!isUpgrade ? (
            <View style={styles.infoContainer}>
              <MaterialIcons name="schedule" size={24} color={colors.warning} />
              <View style={styles.infoText}>
                <Text style={styles.infoTitle}>Downgrades finish later</Text>
                <Text style={styles.infoDescription}>
                  Your current plan stays active until the billing cycle ends.
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.infoContainer}>
            <MaterialIcons
              name={isUpgrade ? 'payment' : 'info'}
              size={24}
              color={isUpgrade ? colors.primary : colors.warning}
            />
            <View style={styles.infoText}>
              <Text style={styles.infoTitle}>
                {isUpgrade ? 'Full-price upgrade' : 'Schedule downgrade'}
              </Text>
              <Text style={styles.infoDescription}>
                {isUpgrade
                  ? 'Choose Paystack or EFT. Upgrades are charged at the full new-plan price with no prorating or split billing.'
                  : 'No payment is required now. You keep the current higher plan until the billing cycle ends.'}
              </Text>
            </View>
          </View>

          {isUpgrade ? (
            <>
              <TouchableOpacity
                style={[styles.payButton, isProcessing && styles.buttonDisabled]}
                onPress={() => runAction(onChoosePaystack, 'Unable to open Paystack')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color={colors.background} />
                ) : (
                  <>
                    <MaterialIcons name="credit-card" size={20} color={colors.background} />
                    <Text style={styles.payButtonText}>Pay with Paystack</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.eftButton, isProcessing && styles.buttonDisabled]}
                onPress={() => runAction(onChooseEFT, 'Unable to open EFT payment')}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator color={colors.primary} />
                ) : (
                  <>
                    <MaterialIcons name="account-balance" size={20} color={colors.primary} />
                    <Text style={styles.eftButtonText}>Pay with EFT</Text>
                  </>
                )}
              </TouchableOpacity>
            </>
          ) : (
            <TouchableOpacity
              style={[styles.payButton, isProcessing && styles.buttonDisabled]}
              onPress={() => runAction(onScheduleDowngrade, 'Unable to schedule downgrade')}
              disabled={isProcessing}
            >
              {isProcessing ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <MaterialIcons name="schedule" size={20} color={colors.background} />
                  <Text style={styles.payButtonText}>Schedule downgrade</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.cancelButton} onPress={onClose} disabled={isProcessing}>
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'flex-start', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  content: { flex: 1, padding: spacing.lg, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: spacing.xl },
  title: { ...typography.h2, color: colors.text, textAlign: 'center', marginBottom: spacing.xl },
  planComparison: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.lg, marginBottom: spacing.xl },
  planBox: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center' },
  planBoxLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  planBoxValue: { ...typography.h4, color: colors.primary, fontWeight: '600' },
  infoContainer: { flexDirection: 'row', gap: spacing.md, backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, marginBottom: spacing.xl },
  infoText: { flex: 1 },
  infoTitle: { ...typography.body, color: colors.text, fontWeight: '600', marginBottom: spacing.xs },
  infoDescription: { ...typography.caption, color: colors.textSecondary },
  payButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.md },
  eftButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.lg, gap: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.primary },
  buttonDisabled: { opacity: 0.6 },
  payButtonText: { ...typography.body, color: colors.background, fontWeight: '600' },
  eftButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },
  cancelButton: { alignItems: 'center', padding: spacing.lg },
  cancelButtonText: { ...typography.body, color: colors.textSecondary },
});
