import React, { useContext, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  FlatList,
  TextInput,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';
import type { Id } from '../lib/config';
import { colors, spacing, radius, typography } from '../lib/theme';
import PackagePaymentModal from './PackagePaymentModal';

type PackageInfo = {
  currentPlan: 'starter' | 'pro' | 'enterprise';
  planName: string;
  maxEmployees: number;
  maxGroups: number;
  maxQuestions?: number;
  currentEmployees: number;
  currentGroups: number;
  features: string[];
  price: number;
  subscriptionStatus: string;
  subscriptionStartDate?: number;
  nextBillingDate?: number;
};

export default function PackageManagementScreen({ navigation }: any) {
  const auth = useContext(AuthContext);
  const { user } = auth ?? {};
  const companyId = user?.companyId as Id<'companies'> | undefined;
  const managerId = user?.userId as Id<'users'> | undefined;

  const [selectedPlan, setSelectedPlan] = useState<
    'starter' | 'pro' | 'enterprise' | null
  >(null);
  const [upgradeReason, setUpgradeReason] = useState('');
  const [isChanging, setIsChanging] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [expandedPlans, setExpandedPlans] = useState<Record<string, boolean>>({});
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [isUpgradePlan, setIsUpgradePlan] = useState(false);
  const [showBrandingModal, setShowBrandingModal] = useState(false);
  const [brandingName, setBrandingName] = useState('');
  const [brandingLogoUrl, setBrandingLogoUrl] = useState('');
  const [brandingPrimaryColor, setBrandingPrimaryColor] = useState('');
  const [brandingSecondaryColor, setBrandingSecondaryColor] = useState('');
  const [brandingAccentColor, setBrandingAccentColor] = useState('');
  const [brandingSupportEmail, setBrandingSupportEmail] = useState('');

  // Queries
  const packageInfo = useQuery(api.packages.getCompanyPackageInfo, 
    companyId ? { companyId } : 'skip'
  );
  const availablePackages = useQuery(api.packages.getAvailablePackages, 
    companyId ? { companyId } : 'skip'
  );
  const branding = useQuery(api.users.getCompanyBranding, 
    companyId ? { companyId } : 'skip'
  );
  const notifications = useQuery(api.packages.getPackageNotifications, 
    managerId ? { managerId } : 'skip'
  );
  const unreadCount = useQuery(api.packages.getUnreadPackageNotificationCount, 
    managerId ? { managerId } : 'skip'
  );
  const history = useQuery(api.packages.getPackageHistory, 
    companyId ? { companyId } : 'skip'
  );

  // Mutations
  const changePackage = useMutation(api.packages.changePackage);
  const updateCompanyBranding = useMutation(api.users.updateCompanyBranding);
  const markNotificationRead = useMutation(
    api.packages.markPackageNotificationRead
  );

  useEffect(() => {
    if (!branding) return;
    setBrandingName(branding.displayName || '');
    setBrandingLogoUrl(branding.logoUrl || '');
    setBrandingPrimaryColor(branding.primaryColor || colors.primary);
    setBrandingSecondaryColor(branding.secondaryColor || colors.secondary);
    setBrandingAccentColor(branding.accentColor || colors.accent);
    setBrandingSupportEmail(branding.supportEmail || '');
  }, [branding]);

  if (!auth) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading package details...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleSelectNewPlan = (plan: string) => {
    if (!packageInfo) return;

    const currentPlan = packageInfo.currentPlan;
    const planOrder = { starter: 0, pro: 1, enterprise: 2 };
    const selectedIsUpgrade =
      planOrder[plan as keyof typeof planOrder] >
      planOrder[currentPlan as keyof typeof planOrder];

    setSelectedPlan(plan as 'starter' | 'pro' | 'enterprise');
    setIsUpgradePlan(selectedIsUpgrade);
    setShowPaymentModal(true);
  };

  const handleChoosePaystack = async () => {
    if (!selectedPlan) return;
    const paystackCheckoutUrls = {
      starter: 'https://paystack.shop/pay/jrfconq79p',
      pro: 'https://paystack.shop/pay/y7f8pmwbe0',
      enterprise: 'https://paystack.shop/pay/hyft2qcnnt',
    } as const;
    const checkoutUrl = paystackCheckoutUrls[selectedPlan as keyof typeof paystackCheckoutUrls];
    if (!checkoutUrl) {
      throw new Error('Paystack checkout is not configured for this plan yet.');
    }
    await Linking.openURL(checkoutUrl);
    setShowPaymentModal(false);
    setSelectedPlan(null);
  };

  const handleChooseEFT = async () => {
    if (!selectedPlan || !companyId || !managerId) return;
    setShowPaymentModal(false);

    const params = { packagePlan: selectedPlan };
    if (typeof navigation.push === "function") {
      navigation.push("EFTPayment", params);
      return;
    }

    navigation.navigate("EFTPayment", params);
  };

  const handleScheduleDowngrade = async () => {
    if (!selectedPlan || !companyId || !managerId) return;
    setIsChanging(true);
    try {
      await changePackage({
        companyId,
        managerId,
        newPlan: selectedPlan,
        reason: 'Scheduled downgrade at the end of the current plan',
      });
      setShowPaymentModal(false);
      setSelectedPlan(null);
      Alert.alert('Scheduled', 'Your downgrade will take effect when the current plan ends.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to schedule downgrade');
    } finally {
      setIsChanging(false);
    }
  };

  const handleSaveBranding = async () => {
    if (!companyId) return;
    try {
      await updateCompanyBranding({
        companyId,
        displayName: brandingName.trim() || undefined,
        logoUrl: brandingLogoUrl.trim() || undefined,
        primaryColor: brandingPrimaryColor.trim() || undefined,
        secondaryColor: brandingSecondaryColor.trim() || undefined,
        accentColor: brandingAccentColor.trim() || undefined,
        supportEmail: brandingSupportEmail.trim() || undefined,
      });
      setShowBrandingModal(false);
      Alert.alert('Saved', 'Company branding updated.');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update branding');
    }
  };

  const getFeatureIcon = (feature: string) => {
    const icons: Record<string, string> = {
      daily_quizzes: 'quiz',
      ai_moderation: 'smart-toy',
      basic_support: 'support',
      wellness_chat: 'spa',
      conflict_resolution: 'handshake',
      support_priority: 'priority-high',
      analytics: 'bar-chart',
      support_24_7: 'schedule',
      analytics_advanced: 'analytics',
      dedicated_manager: 'person',
      custom_branding: 'palette',
      personal_learning: 'school',
      inspection_access: 'fact-check',
      inspection_history: 'history',
      inspection_templates: 'assignment',
      ai_photo_comparison: 'camera-alt',
    };
    return icons[feature] || 'check-circle';
  };

  const getFeatureLabel = (feature: string) => {
    const labels: Record<string, string> = {
      daily_quizzes: 'Daily Auto-Generated Quizzes',
      ai_moderation: 'AI Content Moderation',
      basic_support: 'Email Support',
      wellness_chat: 'AI Wellness Support Chat',
      conflict_resolution: 'AI Conflict Resolution',
      support_priority: 'Priority Support',
      analytics: 'Advanced Analytics',
      support_24_7: 'Email Support',
      analytics_advanced: 'Advanced Analytics & Reporting',
      dedicated_manager: 'Dedicated Account Manager',
      custom_branding: 'Custom Branding',
      personal_learning: 'Personal Learning Plans',
      inspection_access: 'Inspection Access',
      inspection_history: 'Inspection History & Reports',
      inspection_templates: 'Inspection Templates',
      ai_photo_comparison: 'AI Photo Comparison',
    };
    return labels[feature] || feature;
  };

  if (!packageInfo || !availablePackages) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const selectedPackage = availablePackages.find((p: any) => p.plan === selectedPlan);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Notification Badge */}
        {unreadCount && unreadCount > 0 && (
          <TouchableOpacity
            style={styles.notificationBanner}
            onPress={() => setShowHistoryModal(true)}
          >
            <MaterialIcons name="notifications-active" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.notificationTitle}>
                {unreadCount} New {unreadCount === 1 ? 'Notification' : 'Notifications'}
              </Text>
              <Text style={styles.notificationSubtitle}>
                Tap to view your package updates
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
          </TouchableOpacity>
        )}

        {/* Current Plan Card */}
        <View style={styles.currentPlanCard}>
          <Text style={styles.sectionLabel}>Current Plan</Text>
          <View style={styles.planHeader}>
            <View>
              <Text style={styles.planName}>{packageInfo.planName}</Text>
              <Text style={styles.planPrice}>
                R{packageInfo.price}/month
              </Text>
            </View>
            <View
              style={[
                styles.statusBadge,
                {
                  backgroundColor:
                    packageInfo.subscriptionStatus === 'active'
                      ? colors.success + '20'
                      : colors.warning + '20',
                },
              ]}
            >
              <Text
                style={[
                  styles.statusBadgeText,
                  {
                    color:
                      packageInfo.subscriptionStatus === 'active'
                        ? colors.success
                        : colors.warning,
                  },
                ]}
              >
                {packageInfo.subscriptionStatus.charAt(0).toUpperCase() +
                  packageInfo.subscriptionStatus.slice(1)}
              </Text>
            </View>
          </View>

          {packageInfo.nextBillingDate && (
            <View style={styles.billingInfo}>
              <MaterialIcons name="calendar-today" size={16} color={colors.textSecondary} />
              <Text style={styles.billingText}>
                Next billing: {new Date(packageInfo.nextBillingDate).toLocaleDateString()}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={styles.brandingButton}
            onPress={() => setShowBrandingModal(true)}
          >
            <MaterialIcons name="palette" size={20} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={styles.brandingButtonTitle}>Company logo & branding</Text>
              <Text style={styles.brandingButtonSubtitle}>
                {packageInfo.currentPlan === 'enterprise'
                  ? 'Edit your logo, colors, and support email'
                  : 'Available on Enterprise package'}
              </Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.primary} />
          </TouchableOpacity>

          {/* Usage Stats */}
          <View style={styles.usageContainer}>
            <View style={styles.usageCard}>
              <Text style={styles.usageLabel}>Employees</Text>
              <Text style={styles.usageValue}>
                {packageInfo.currentEmployees}/{packageInfo.maxEmployees}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(packageInfo.currentEmployees / packageInfo.maxEmployees) * 100}%`,
                      backgroundColor:
                        packageInfo.currentEmployees / packageInfo.maxEmployees > 0.8
                          ? colors.warning
                          : colors.success,
                    },
                  ]}
                />
              </View>
            </View>

            <View style={styles.usageCard}>
              <Text style={styles.usageLabel}>Groups</Text>
              <Text style={styles.usageValue}>
                {packageInfo.currentGroups}/{packageInfo.maxGroups}
              </Text>
              <View style={styles.progressBar}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${(packageInfo.currentGroups / packageInfo.maxGroups) * 100}%`,
                      backgroundColor:
                        packageInfo.currentGroups / packageInfo.maxGroups > 0.8
                          ? colors.warning
                          : colors.success,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Current Features */}
          <View style={styles.featuresContainer}>
            <Text style={styles.featuresLabel}>Included Features</Text>
            {packageInfo.features.map((feature: string, idx: number) => (
              <View key={idx} style={styles.featureRow}>
                <MaterialIcons
                  name={getFeatureIcon(feature) as any}
                  size={18}
                  color={colors.success}
                />
                <Text style={styles.featureText}>{getFeatureLabel(feature)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Available Plans for Upgrade/Downgrade */}
        <Text style={styles.sectionTitle}>Available Plans</Text>

        {availablePackages.map((pkg: any) => (
          <TouchableOpacity
            key={pkg.plan}
            style={[
              styles.planOptionCard,
              selectedPlan === pkg.plan && styles.planOptionCardSelected,
            ]}
            onPress={() => handleSelectNewPlan(pkg.plan)}
            disabled={!pkg.canUpgradeTo && !pkg.canDowngradeTo}
          >
            <View style={styles.planOptionHeader}>
              <View>
                <Text style={styles.planOptionName}>{pkg.name}</Text>
                <Text style={styles.planOptionPrice}>R{pkg.price}/month</Text>
              </View>
              {pkg.isCurrentPlan ? (
                <View style={styles.currentBadge}>
                  <Text style={styles.currentBadgeText}>Current</Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.selectCircle,
                    selectedPlan === pkg.plan && styles.selectCircleActive,
                  ]}
                >
                  {selectedPlan === pkg.plan && (
                    <MaterialIcons name="check" size={16} color={colors.background} />
                  )}
                </View>
              )}
            </View>

            <Text style={styles.planOptionLimits}>
              Up to {pkg.maxEmployees} employees " {pkg.maxGroups} groups
            </Text>
            <Text style={styles.planOptionLimits}>
              {pkg.plan === 'enterprise'
                ? 'Includes every learning, support, analytics, and inspection feature'
                : pkg.features.includes('inspection_templates')
                ? 'Includes inspection templates, history, and AI photo comparison'
                : pkg.features.includes('inspection_history')
                ? 'Includes inspection history and learning access'
                : 'Includes daily quizzes, policies, learning, and core business tools'}
            </Text>

            {pkg.reason && (
              <View style={styles.reasonBox}>
                <MaterialIcons name="info" size={16} color={colors.warning} />
                <Text style={styles.reasonText}>{pkg.reason}</Text>
              </View>
            )}

            {/* Plan features preview */}
            <View style={styles.planFeatures}>
              {pkg.features.slice(0, 3).map((feature: string, idx: number) => (
                <View key={idx} style={styles.planFeatureBadge}>
                  <Text style={styles.planFeatureBadgeText}>{getFeatureLabel(feature)}</Text>
                </View>
              ))}
              {pkg.features.length > 3 && (
                <TouchableOpacity
                  style={styles.planFeatureBadge}
                  onPress={() =>
                    setExpandedPlans((current: Record<string, boolean>) => ({
                      ...current,
                      [pkg.plan]: !current[pkg.plan],
                    }))
                  }
                >
                  <Text style={styles.planFeatureBadgeText}>
                    {expandedPlans[pkg.plan] ? 'Show less' : `+${pkg.features.length - 3} more`}
                  </Text>
                </TouchableOpacity>
              )}
              {expandedPlans[pkg.plan] && pkg.features.slice(3).map((feature: string, idx: number) => (
                <View key={`${pkg.plan}-extra-${idx}`} style={styles.planFeatureBadge}>
                  <Text style={styles.planFeatureBadgeText}>{getFeatureLabel(feature)}</Text>
                </View>
              ))}
            </View>

            {!pkg.isCurrentPlan && (
              <Text style={styles.availableText}>Available now</Text>
            )}
          </TouchableOpacity>
        ))}

        {/* View History Button */}
        <TouchableOpacity
          style={styles.historyButton}
          onPress={() => setShowHistoryModal(true)}
        >
          <MaterialIcons name="history" size={20} color={colors.primary} />
          <Text style={styles.historyButtonText}>View Plan History</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>

     {/* Payment Modal */}
      {selectedPackage && (
        <PackagePaymentModal
          visible={showPaymentModal}
          currentPlan={packageInfo.currentPlan}
          currentPlanName={packageInfo.planName}
          newPlan={selectedPlan!}
          newPlanName={selectedPackage.name}
          isUpgrade={isUpgradePlan}
          onChoosePaystack={handleChoosePaystack}
          onChooseEFT={handleChooseEFT}
          onScheduleDowngrade={handleScheduleDowngrade}
          onClose={() => {
            setShowPaymentModal(false);
            setSelectedPlan(null);
          }}
        />
      )}

      <Modal visible={showBrandingModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Company Branding</Text>
            <TouchableOpacity onPress={() => setShowBrandingModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.modalContent}>
            <Text style={styles.modalSectionTitle}>Logo & Display Name</Text>
            <TextInput style={styles.input} placeholder="Company display name" value={brandingName} onChangeText={setBrandingName} />
            <TextInput style={styles.input} placeholder="Logo URL" value={brandingLogoUrl} onChangeText={setBrandingLogoUrl} />
            <Text style={styles.helpText}>The custom branding applies to Enterprise customers after approval.</Text>

            <Text style={styles.modalSectionTitle}>Brand Colors</Text>
            <TextInput style={styles.input} placeholder="Primary color" value={brandingPrimaryColor} onChangeText={setBrandingPrimaryColor} />
            <TextInput style={styles.input} placeholder="Secondary color" value={brandingSecondaryColor} onChangeText={setBrandingSecondaryColor} />
            <TextInput style={styles.input} placeholder="Accent color" value={brandingAccentColor} onChangeText={setBrandingAccentColor} />

            <Text style={styles.modalSectionTitle}>Support Email</Text>
            <TextInput style={styles.input} placeholder="support@company.com" value={brandingSupportEmail} onChangeText={setBrandingSupportEmail} keyboardType="email-address" autoCapitalize="none" />

            <TouchableOpacity style={styles.saveBrandingButton} onPress={handleSaveBranding}>
              <Text style={styles.saveBrandingButtonText}>Save Branding</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* History Modal */}
      <Modal visible={showHistoryModal} animationType="slide" transparent>
        <SafeAreaView style={styles.modalContainer} edges={['top', 'bottom']}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Plan History & Notifications</Text>
            <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.modalContent}>
            {/* Notifications */}
            {notifications && notifications.length > 0 && (
              <View>
                <Text style={styles.modalSectionTitle}>Notifications</Text>
                {notifications.map((notif: any) => (
                  <TouchableOpacity
                    key={notif._id}
                    style={[
                      styles.notificationItem,
                      !notif.isRead && styles.notificationItemUnread,
                    ]}
                    onPress={async () => {
                      if (!notif.isRead) {
                        await markNotificationRead({ notificationId: notif._id });
                      }
                    }}
                  >
                    <View style={styles.notificationIcon}>
                      <MaterialIcons
                        name={
                          notif.type === 'upgrade'
                            ? 'trending-up'
                            : notif.type === 'downgrade'
                            ? 'trending-down'
                            : 'notifications'
                        }
                        size={20}
                        color={
                          notif.type === 'upgrade'
                            ? colors.success
                            : notif.type === 'downgrade'
                            ? colors.warning
                            : colors.primary
                        }
                      />
                    </View>
                    <View style={styles.notificationContent}>
                      <Text style={styles.notificationItemTitle}>{notif.title}</Text>
                      <Text style={styles.notificationItemMessage}>{notif.message}</Text>
                      <Text style={styles.notificationItemDate}>
                        {new Date(notif.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            {/* History */}
            {history && history.length > 0 && (
              <View>
                <Text style={[styles.modalSectionTitle, { marginTop: spacing.lg }]}>
                  Plan Changes
                </Text>
                {history.map((item: any, idx: number) => (
                  <View key={idx} style={styles.historyItem}>
                    <View style={styles.historyArrow}>
                      <Text style={styles.historyPlan}>{item.previousPlan}</Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={16}
                        color={colors.textSecondary}
                      />
                      <Text style={styles.historyPlan}>{item.newPlan}</Text>
                    </View>
                    <Text style={styles.historyDate}>
                      {new Date(item.createdAt).toLocaleDateString()}
                    </Text>
                    {item.reason && (
                      <Text style={styles.historyReason}>{item.reason}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}

            {!notifications || (notifications.length === 0 && (!history || history.length === 0)) && (
              <View style={styles.emptyState}>
                <MaterialIcons name="info" size={40} color={colors.textTertiary} />
                <Text style={styles.emptyStateText}>No history yet</Text>
              </View>
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  content: { flex: 1, padding: spacing.lg },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },

  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  notificationTitle: { ...typography.body, color: colors.primary, fontWeight: '600' },
  notificationSubtitle: { ...typography.caption, color: colors.textSecondary },

  currentPlanCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  sectionLabel: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.sm },
  planHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planName: { ...typography.h3, color: colors.text },
  planPrice: { ...typography.body, color: colors.primary, fontWeight: '600', marginTop: spacing.xs },
  statusBadge: { paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md },
  statusBadgeText: { ...typography.caption, fontWeight: '600' },

  billingInfo: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginTop: spacing.md },
  billingText: { ...typography.caption, color: colors.textSecondary },

  brandingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    padding: spacing.md,
    marginTop: spacing.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
  },
  brandingButtonTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  brandingButtonSubtitle: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, marginBottom: spacing.sm, color: colors.text },
  helpText: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.md },
  saveBrandingButton: { backgroundColor: colors.primary, borderRadius: radius.lg, padding: spacing.lg, alignItems: 'center', marginTop: spacing.md },
  saveBrandingButtonText: { ...typography.body, color: colors.background, fontWeight: '600' },

  usageContainer: { flexDirection: 'row', gap: spacing.md, marginTop: spacing.lg },
  usageCard: { flex: 1 },
  usageLabel: { ...typography.caption, color: colors.textSecondary },
  usageValue: { ...typography.h4, color: colors.text, marginTop: spacing.xs },
  progressBar: { height: 6, backgroundColor: colors.border, borderRadius: radius.sm, marginTop: spacing.xs, overflow: 'hidden' },
  progressFill: { height: '100%' },

  featuresContainer: { marginTop: spacing.lg },
  featuresLabel: { ...typography.bodyMedium, color: colors.text, fontWeight: '600', marginBottom: spacing.sm },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, marginBottom: spacing.sm },
  featureText: { ...typography.caption, color: colors.textSecondary },

  sectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.md },
  planOptionCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  planOptionCardSelected: { borderColor: colors.primary, borderWidth: 2 },
  planOptionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  planOptionName: { ...typography.body, color: colors.text, fontWeight: '600' },
  planOptionPrice: { ...typography.caption, color: colors.primary, marginTop: spacing.xs },
  currentBadge: { backgroundColor: colors.success + '20', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.md },
  currentBadgeText: { ...typography.caption, color: colors.success, fontWeight: '600' },
  selectCircle: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: colors.border },
  selectCircleActive: { borderColor: colors.primary, backgroundColor: colors.primary },

  planOptionLimits: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm },

  reasonBox: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.warning + '10', borderRadius: radius.md, padding: spacing.sm, marginTop: spacing.sm },
  reasonText: { ...typography.caption, color: colors.warning, flex: 1 },

  planFeatures: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.sm, marginTop: spacing.md },
  planFeatureBadge: { backgroundColor: colors.primary + '15', paddingHorizontal: spacing.md, paddingVertical: spacing.xs, borderRadius: radius.sm },
  planFeatureBadgeText: { ...typography.caption, color: colors.primary, fontSize: 10 },

  availableText: { ...typography.caption, color: colors.success, marginTop: spacing.sm, fontWeight: '600' },
  unavailableText: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm, fontStyle: 'italic' },

  reasonInputContainer: { marginTop: spacing.lg, marginBottom: spacing.lg },
  reasonInputLabel: { ...typography.body, color: colors.text, fontWeight: '600', marginBottom: spacing.sm },
  reasonInput: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, borderWidth: 1, borderColor: colors.border, minHeight: 84, textAlignVertical: 'top' },
  reasonInputPlaceholder: { ...typography.body, color: colors.textTertiary },

  paymentProofContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    backgroundColor: colors.warning + '15',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  paymentProofTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  paymentProofText: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },

  changeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  buttonDisabled: { opacity: 0.6 },
  changeButtonText: { ...typography.body, color: colors.background, fontWeight: '600' },

  historyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: radius.lg,
  },
  historyButtonText: { ...typography.body, color: colors.primary, fontWeight: '600' },

  // Modal
  modalContainer: { flex: 1, backgroundColor: colors.background },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  modalTitle: { ...typography.h3, color: colors.text },
  modalContent: { flex: 1, padding: spacing.lg },
  modalSectionTitle: { ...typography.h4, color: colors.text, marginBottom: spacing.md },

  notificationItem: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm, flexDirection: 'row', gap: spacing.md },
  notificationItemUnread: { borderLeftWidth: 4, borderLeftColor: colors.primary },
  notificationIcon: { width: 40, height: 40, borderRadius: radius.md, backgroundColor: colors.primary + '15', justifyContent: 'center', alignItems: 'center' },
  notificationContent: { flex: 1 },
  notificationItemTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  notificationItemMessage: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.xs },
  notificationItemDate: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs },

  historyItem: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.sm },
  historyArrow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  historyPlan: { ...typography.body, color: colors.primary, fontWeight: '600' },
  historyDate: { ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm },
  historyReason: { ...typography.caption, color: colors.textSecondary, marginTop: spacing.sm, fontStyle: 'italic' },

  emptyState: { alignItems: 'center', justifyContent: 'center', paddingVertical: spacing.xl },
  emptyStateText: { ...typography.body, color: colors.textTertiary, marginTop: spacing.md },
});
