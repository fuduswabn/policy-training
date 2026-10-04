import React, { useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../lib/config';
import type { Id } from '../lib/config';
import { colors, spacing, radius, typography, shadows } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';

type Props = { onClose?: () => void; companyId?: Id<'companies'> };

type PackagePlan = 'starter' | 'pro' | 'enterprise';

type PackageItem = {
  plan: PackagePlan;
  name: string;
  price: number;
  maxEmployees: number;
  maxGroups: number;
  features: string[];
  isCurrentPlan: boolean;
  canDowngradeTo: boolean;
  canUpgradeTo: boolean;
  reason?: string;
};

const paystackCheckoutUrls = {
  starter: 'https://paystack.shop/pay/jrfconq79p',
  pro: 'https://paystack.shop/pay/y7f8pmwbe0',
  enterprise: 'https://paystack.shop/pay/hyft2qcnnt',
} as const;

export default function PaywallScreen({ onClose, companyId }: Props) {
  const auth = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const packages = useQuery(api.packages.getAvailablePackages, companyId ? { companyId } : 'skip') as PackageItem[] | undefined;

  const openPaystack = async (plan: PackagePlan) => {
    const checkoutUrl = paystackCheckoutUrls[plan];
    if (!checkoutUrl) {
      Alert.alert('Payment unavailable', 'Paystack checkout is not configured for this plan yet.');
      return;
    }

    try {
      await Linking.openURL(checkoutUrl);
    } catch (error: any) {
      Alert.alert('Payment error', error?.message || 'Unable to open Paystack checkout.');
    }
  };

  const openEFT = (plan: PackagePlan) => {
    const params = { packagePlan: plan };
    if (typeof navigation.push === "function") {
      navigation.push("EFTPayment", params);
      return;
    }

    navigation.navigate("EFTPayment", params);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.kicker}>APK Access</Text>
          <Text style={styles.title}>Choose your package</Text>
        </View>
        <View style={styles.headerActions}>
          {auth?.signOut ? (
            <TouchableOpacity onPress={auth.signOut} style={styles.iconButton}>
              <MaterialIcons name="logout" size={22} color={colors.textSecondary} />
            </TouchableOpacity>
          ) : null}
          {onClose ? (
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          ) : null}
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.heroCard}>
          <Text style={styles.heroTitle}>Paystack and EFT are both live</Text>
          <Text style={styles.heroText}>
            Choose Paystack for online card/bank payments or EFT for manual bank transfer proof.
          </Text>
          <View style={styles.benefitsRow}>
            <Benefit label="10 / 50 / 200 seats" />
            <Benefit label="Seat limits enforced" />
            <Benefit label="Paystack + EFT" />
          </View>
        </View>

        {!packages ? (
          <View style={styles.loadingCard}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading packages…</Text>
          </View>
        ) : (
          packages.map((pkg) => (
            <View key={pkg.plan} style={styles.planCard}>
              {pkg.isCurrentPlan ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>CURRENT</Text>
                </View>
              ) : null}

              <View style={styles.planRow}>
                <View style={styles.planIcon}>
                  <MaterialIcons name="workspace-premium" size={22} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle}>{pkg.name}</Text>
                  <Text style={styles.planSub}>{pkg.maxEmployees} users • {pkg.maxGroups} groups</Text>
                  {!!pkg.reason && <Text style={styles.planReason}>{pkg.reason}</Text>}
                </View>
                <Text style={styles.planPrice}>R{pkg.price}</Text>
              </View>

              <View style={styles.featureList}>
                {pkg.features.map((feature) => (
                  <View key={feature} style={styles.featureRow}>
                    <MaterialIcons name="check-circle" size={16} color={colors.success} />
                    <Text style={styles.featureText}>{feature.replaceAll('_', ' ')}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.primaryActionButton} onPress={() => openPaystack(pkg.plan)}>
                  <Text style={styles.primaryActionText}>Pay with Paystack</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.secondaryActionButton} onPress={() => openEFT(pkg.plan)}>
                  <Text style={styles.secondaryActionText}>Pay by EFT</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function Benefit({ label }: { label: string }) {
  return (
    <View style={styles.benefitPill}>
      <MaterialIcons name="check-circle" size={14} color={colors.success} />
      <Text style={styles.benefitText}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  kicker: { ...typography.caption, color: colors.primary, textTransform: 'uppercase', letterSpacing: 1 },
  title: { ...typography.h3, color: colors.text, marginTop: 2 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  iconButton: {
    padding: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surface,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  heroCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  heroTitle: { ...typography.h4, color: colors.text },
  heroText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.sm },
  benefitsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  benefitPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
  },
  benefitText: { ...typography.caption, color: colors.textSecondary, fontWeight: '600' },
  loadingCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.xl,
  },
  loadingText: { ...typography.body, color: colors.textSecondary },
  planCard: {
    backgroundColor: colors.background,
    borderRadius: radius.xl,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    gap: spacing.md,
    ...shadows.sm,
  },
  currentBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.success + '18',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
  },
  currentBadgeText: { ...typography.caption, color: colors.success, fontWeight: '700' },
  planRow: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md },
  planIcon: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '14',
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { ...typography.body, color: colors.text, fontWeight: '700' },
  planSub: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  planReason: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },
  planPrice: { ...typography.body, color: colors.primary, fontWeight: '700' },
  featureList: { gap: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  featureText: { ...typography.body, color: colors.text, flex: 1 },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryActionText: { ...typography.body, color: colors.background, fontWeight: '700' },
  secondaryActionButton: {
    flex: 1,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: { ...typography.body, color: colors.text, fontWeight: '700' },
});
