import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Linking,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../../lib/config';
import { colors, spacing, radius, typography } from '../../lib/theme';

type Props = {
  onBack?: () => void;
};

export default function PaymentVerificationScreen({ onBack }: Props) {
  const pendingPayments = useQuery(api.eft.getPendingEFTPayments);
  const verifyPayment = useMutation(api.eft.verifyEFTPayment);

  const [selectedPayment, setSelectedPayment] = useState<any>(null);
  const [verificationNotes, setVerificationNotes] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  React.useEffect(() => {
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      if (onBack) {
        onBack();
        return true;
      }
      return false;
    });

    return () => sub.remove();
  }, [onBack]);

  if (!pendingPayments) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: spacing.xl * 2 }} />
      </SafeAreaView>
    );
  }

  const handleApprove = async () => {
    if (!selectedPayment) return;
    setIsVerifying(true);
    try {
      await verifyPayment({
        paymentId: selectedPayment._id,
        verified: true,
        notes: verificationNotes,
      });
      Alert.alert('Success', 'Payment approved! Subscription activated.');
      setSelectedPayment(null);
      setVerificationNotes('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to approve');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment) return;
    setIsVerifying(true);
    try {
      await verifyPayment({
        paymentId: selectedPayment._id,
        verified: false,
        notes: verificationNotes || 'Rejected',
      });
      Alert.alert('Done', 'Payment rejected.');
      setSelectedPayment(null);
      setVerificationNotes('');
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to reject');
    } finally {
      setIsVerifying(false);
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'starter': return colors.warning;
      case 'pro': return '#9C27B0';
      case 'enterprise': return colors.success;
      default: return colors.primary;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => onBack?.()}
          style={styles.backButton}
        >
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Verify Payments</Text>
          <Text style={styles.subtitle}>Submitted: {pendingPayments?.length || 0}</Text>
        </View>
      </View>

      <ScrollView style={styles.list}>
        {pendingPayments.length === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="check-circle" size={48} color={colors.success} />
            <Text style={styles.emptyText}>All payments verified!</Text>
          </View>
        ) : (
          pendingPayments.map((payment: any) => (
            <TouchableOpacity
              key={payment._id}
              onPress={() => setSelectedPayment(payment)}
              style={styles.card}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.md }}>
                <View style={[styles.badge, { backgroundColor: getPlanColor(payment.packagePlan) + '20' }]}>
                  <Text style={[styles.badgeText, { color: getPlanColor(payment.packagePlan) }]}>
                    {payment.packagePlan?.[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.plan}>{payment.packagePlan || 'Unknown'}</Text>
                  <Text style={styles.company}>Company: {payment.companyName || 'Company'}</Text>
                  <Text style={styles.email}>Email: {payment.userEmail || 'email@example.com'}</Text>
                  <Text style={styles.ref}>Reference: {payment.paymentReference}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.amount}>R{payment.amount || 0}</Text>
                  <Text style={styles.ref}>{payment.paymentReference?.slice(-6)}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Detail Modal */}
      <Modal visible={!!selectedPayment} transparent animationType="slide">
        <SafeAreaView style={styles.modal}>
          <KeyboardAvoidingView
            style={styles.modalKeyboard}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedPayment(null)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Payment Details</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView
              style={styles.modalContent}
              contentContainerStyle={styles.modalContentContainer}
              keyboardShouldPersistTaps="handled"
              keyboardDismissMode="on-drag"
            >
              {/* Plan Info */}
              <View style={styles.section}>
                <Text style={styles.sectionHead}>Plan</Text>
                <Text style={styles.sectionValue}>{selectedPayment?.packagePlan || 'N/A'}</Text>
              </View>

              {/* Amount */}
              <View style={styles.section}>
                <Text style={styles.sectionHead}>Amount</Text>
                <Text style={styles.sectionValue}>R{selectedPayment?.amount || 0}</Text>
              </View>

              {/* Reference */}
              <View style={styles.section}>
                <Text style={styles.sectionHead}>Reference</Text>
                <Text style={[styles.sectionValue, { fontFamily: 'monospace', fontSize: 12 }]}>
                  {selectedPayment?.paymentReference || 'N/A'}
                </Text>
                <Text style={styles.sectionNote}>Short company-based reference. Match it with company name and email on the bank statement.</Text>
              </View>

              {/* Company */}
              <View style={styles.section}>
                <Text style={styles.sectionHead}>Company</Text>
                <Text style={styles.sectionValue}>{selectedPayment?.companyName || 'N/A'}</Text>
              </View>

              {/* Email */}
              <View style={styles.section}>
                <Text style={styles.sectionHead}>Email</Text>
                <Text style={styles.sectionValue}>{selectedPayment?.userEmail || 'N/A'}</Text>
              </View>

              {/* Reply by email */}
              <TouchableOpacity
                style={[styles.btn, { backgroundColor: colors.secondary, marginBottom: spacing.lg }]}
                onPress={async () => {
                  if (!selectedPayment?.userEmail) return;
                  const subject = encodeURIComponent(`Payment proof received - ${selectedPayment.companyName || 'Client'}`);
                  const body = encodeURIComponent('Hi, we have received your payment proof and will review it shortly.');
                  await Linking.openURL(`mailto:${selectedPayment.userEmail}?subject=${subject}&body=${body}`);
                }}
              >
                <Text style={[styles.btnText, { color: colors.background }]}>Reply by email</Text>
              </TouchableOpacity>

              {/* Proof */}
              {selectedPayment?.proofOfPaymentUrl && (
                <View style={styles.section}>
                  <Text style={styles.sectionHead}>Proof of Payment</Text>
                  <Image
                    source={{ uri: selectedPayment.proofOfPaymentUrl }}
                    style={styles.proofImage}
                  />
                </View>
              )}

              {/* Notes */}
              <View style={styles.section}>
                <Text style={styles.sectionHead}>Notes</Text>
                <TextInput
                  style={styles.notesBox}
                  placeholder="Add verification notes..."
                  value={verificationNotes}
                  onChangeText={setVerificationNotes}
                  multiline
                  numberOfLines={4}
                />
              </View>

              {/* Banking Details */}
              <View style={[styles.section, { backgroundColor: colors.surface, padding: spacing.md, borderRadius: radius.md }]}>
                <Text style={styles.sectionHead}>Expected Bank Details</Text>
                <Text style={styles.bankDetail}>Bank: Standard Bank</Text>
                <Text style={styles.bankDetail}>Branch: DURBAN ABC (126)</Text>
                <Text style={styles.bankDetail}>Account: 05 058 076 0</Text>
                <Text style={styles.bankDetail}>Ref: {selectedPayment?.paymentReference || 'N/A'}</Text>
              </View>
            </ScrollView>

            {/* Buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                onPress={handleReject}
                disabled={isVerifying}
                style={[styles.btn, { borderWidth: 1, borderColor: colors.error }]}
              >
                <Text style={[styles.btnText, { color: colors.error }]}>Reject</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApprove}
                disabled={isVerifying}
                style={[styles.btn, { backgroundColor: colors.success }]}
              >
                <Text style={[styles.btnText, { color: colors.background }]}>Approve</Text>
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border, gap: spacing.md },
  backButton: { padding: spacing.sm },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  list: { flex: 1, padding: spacing.md },
  empty: { alignItems: 'center', justifyContent: 'center', marginTop: spacing.xl * 3 },
  emptyText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
  },
  badge: { width: 50, height: 50, borderRadius: radius.md, justifyContent: 'center', alignItems: 'center' },
  badgeText: { ...typography.h3, fontWeight: '700' },
  plan: { ...typography.body, color: colors.text, fontWeight: '600' },
  company: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  email: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  amount: { ...typography.body, color: colors.text, fontWeight: '700' },
  ref: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  modal: { flex: 1, backgroundColor: colors.background },
  modalKeyboard: { flex: 1 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { ...typography.h3, color: colors.text },
  modalContent: { flex: 1, padding: spacing.lg },
  modalContentContainer: { paddingBottom: spacing.xl * 2 },
  section: { marginBottom: spacing.lg },
  sectionHead: { ...typography.caption, color: colors.textSecondary, fontWeight: '600', marginBottom: spacing.sm },
  sectionValue: { ...typography.body, color: colors.text, fontWeight: '500' },
  sectionNote: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  bankDetail: { ...typography.caption, color: colors.text, marginTop: spacing.sm },
  notesBox: { backgroundColor: colors.background, borderWidth: 1, borderColor: colors.border, borderRadius: radius.md, padding: spacing.md, color: colors.text, textAlignVertical: 'top' },
  proofImage: { width: '100%', height: 250, borderRadius: radius.md, marginTop: spacing.sm },
  actions: { flexDirection: 'row', gap: spacing.md, padding: spacing.lg, borderTopWidth: 1, borderTopColor: colors.border },
  btn: { flex: 1, paddingVertical: spacing.md, borderRadius: radius.lg, alignItems: 'center' },
  btnText: { ...typography.body, fontWeight: '600' },
});