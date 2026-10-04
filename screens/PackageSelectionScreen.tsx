import React, { useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useQuery } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';

interface PackageSelectionScreenProps {
  onPackageSelected: (packageRef: string) => void;
  onSkip: () => void;
}

type PackageItem = {
  identifier: string;
  product: {
    title: string;
    description?: string;
    priceString: string;
  };
};

type PackageDetail = {
  icon: string;
  color: string;
  features: string[];
  popular?: boolean;
};

const getPlanKey = (identifier: string, title: string) => {
  const combined = `${identifier} ${title}`.toLowerCase();
  if (combined.includes('enterprise')) return 'enterprise';
  if (combined.includes('pro') || combined.includes('professional')) return 'pro';
  return 'starter';
};

const paystackCheckoutUrls = {
  starter: 'https://paystack.shop/pay/jrfconq79p',
  pro: 'https://paystack.shop/pay/y7f8pmwbe0',
  enterprise: 'https://paystack.shop/pay/hyft2qcnnt',
} as const;

export default function PackageSelectionScreen({ onPackageSelected, onSkip }: PackageSelectionScreenProps) {
  const auth = useContext(AuthContext);
  const navigation = useNavigation<any>();
  const companyId = auth?.user?.companyId;
  const backendPackages = useQuery(api.packages.getAvailablePackages, companyId ? { companyId } : 'skip') as
    | Array<{ plan: 'starter' | 'pro' | 'enterprise'; name: string; price: number; reason?: string }>
    | undefined;

  const packages: PackageItem[] = backendPackages
    ? backendPackages.map((pkg) => ({
        identifier: pkg.plan,
        product: {
          title: pkg.name,
          description: pkg.reason,
          priceString: `R${pkg.price}`,
        },
      }))
    : [];

  const isLoading = !!companyId && backendPackages === undefined;

  const packageDetails: Record<string, PackageDetail> = {
    starter: {
      icon: 'business',
      color: colors.primary,
      features: [
        'Up to 10 employees',
        'Up to 3 employee groups',
        'Daily auto-generated quizzes',
        'Policy acknowledgements',
        'Personal learning plans',
        'Basic inspection access',
      ],
    },
    pro: {
      icon: 'trending-up',
      color: colors.secondary,
      features: [
        'Up to 50 employees',
        'Up to 10 employee groups',
        'Daily auto-generated quizzes',
        'AI wellness chat',
        'Conflict resolution support',
        'Advanced analytics',
        'Personal learning plans',
        'Inspection history and reports',
      ],
      popular: true,
    },
    enterprise: {
      icon: 'business-center',
      color: colors.success,
      features: [
        'Up to 200 employees',
        'Up to 50 employee groups',
        'Daily auto-generated quizzes',
        'Policy acknowledgements',
        'Email support',
        'AI wellness chat',
        'Conflict resolution support',
        'Advanced analytics',
        'Custom branding',
        'Personal learning plans in every package',
        'Inspection access',
        'Inspection history and reports',
        'Inspection templates',
        'AI photo comparison',
      ],
    },
  };

  const openPaystack = async (pkg: PackageItem) => {
    const planKey = getPlanKey(pkg.identifier, pkg.product.title) as keyof typeof paystackCheckoutUrls;
    const checkoutUrl = paystackCheckoutUrls[planKey];

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

  const openEFT = (pkg: PackageItem) => {
    const planKey = getPlanKey(pkg.identifier, pkg.product.title) as keyof typeof paystackCheckoutUrls;
    onPackageSelected(pkg.identifier);

    const params = { packagePlan: planKey };
    if (typeof navigation.push === "function") {
      navigation.push("EFTPayment", params);
      return;
    }

    navigation.navigate("EFTPayment", params);
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading packages...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Text style={styles.title}>Choose Your Plan</Text>
          <Text style={styles.subtitle}>
            Select the package that matches your team size and the tools you need.
          </Text>
        </View>

        <TouchableOpacity style={styles.freeCard} onPress={onSkip}>
          <View style={styles.freeCardHeader}>
            <MaterialIcons name="schedule" size={32} color={colors.warning} />
            <View style={styles.freeCardInfo}>
              <Text style={styles.freeCardTitle}>Start with Free Trial</Text>
              <Text style={styles.freeCardSubtitle}>14 days • No credit card required</Text>
            </View>
          </View>
          <Text style={styles.freeCardText}>
            Try out the platform with the package features you select. Upgrade anytime to unlock the next tier.
          </Text>
          <View style={styles.freeCardButton}>
            <Text style={styles.freeCardButtonText}>Start Free Trial</Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.primary} />
          </View>
        </TouchableOpacity>

        <View style={styles.divider}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>OR CHOOSE A PLAN</Text>
          <View style={styles.dividerLine} />
        </View>

        {packages.map((pkg) => {
          const planKey = getPlanKey(pkg.identifier, pkg.product.title);
          const details = packageDetails[planKey];
          if (!details) return null;

          return (
            <View key={pkg.identifier} style={styles.packageCard}>
              {details.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularBadgeText}>MOST POPULAR</Text>
                </View>
              )}

              <View style={styles.packageHeader}>
                <View style={[styles.packageIcon, { backgroundColor: details.color + '20' }]}>
                  <MaterialIcons name={details.icon as any} size={32} color={details.color} />
                </View>
                <View style={styles.packageTitleContainer}>
                  <Text style={styles.packageName}>{pkg.product.title}</Text>
                  <Text style={styles.packagePrice}>{pkg.product.priceString}/month</Text>
                </View>
              </View>

              {pkg.product.description ? <Text style={styles.packageDescription}>{pkg.product.description}</Text> : null}

              <View style={styles.featuresContainer}>
                {details.features.map((feature, index) => (
                  <View key={index} style={styles.featureRow}>
                    <MaterialIcons name="check-circle" size={20} color={details.color} />
                    <Text style={styles.featureText}>{feature}</Text>
                  </View>
                ))}
              </View>

              <View style={styles.actionRow}>
                <TouchableOpacity style={styles.primaryActionButton} onPress={() => openPaystack(pkg)}>
                  <Text style={styles.primaryActionText}>Pay with Paystack</Text>
                </TouchableOpacity>

                <TouchableOpacity style={styles.secondaryActionButton} onPress={() => openEFT(pkg)}>
                  <Text style={styles.secondaryActionText}>Pay by EFT</Text>
                </TouchableOpacity>
              </View>

              <Text style={styles.trialNote}>14-day free trial included</Text>
            </View>
          );
        })}

        {packages.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="error-outline" size={64} color={colors.textTertiary} />
            <Text style={styles.emptyTitle}>No packages available</Text>
            <Text style={styles.emptyText}>Please contact support or start with the free trial.</Text>
            <TouchableOpacity style={styles.emptyButton} onPress={onSkip}>
              <Text style={styles.emptyButtonText}>Start Free Trial</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    lineHeight: 22,
  },
  freeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 2,
    borderColor: colors.warning,
    marginBottom: spacing.lg,
  },
  freeCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  freeCardInfo: {
    marginLeft: spacing.md,
    flex: 1,
  },
  freeCardTitle: {
    ...typography.h4,
    color: colors.text,
  },
  freeCardSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  freeCardText: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
  },
  freeCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  freeCardButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: spacing.xl,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  dividerText: {
    ...typography.caption,
    color: colors.textTertiary,
    paddingHorizontal: spacing.md,
  },
  packageCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: spacing.lg,
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  popularBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '700',
    fontSize: 10,
  },
  packageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  packageIcon: {
    width: 56,
    height: 56,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  packageTitleContainer: {
    marginLeft: spacing.md,
    flex: 1,
  },
  packageName: {
    ...typography.h3,
    color: colors.text,
  },
  packagePrice: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  packageDescription: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  featuresContainer: {
    marginBottom: spacing.lg,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  featureText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  actionRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  primaryActionButton: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.primary,
  },
  primaryActionText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  secondaryActionButton: {
    flex: 1,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryActionText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  trialNote: {
    ...typography.caption,
    color: colors.textTertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    padding: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  emptyButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});
