import { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Linking, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { api } from '../lib/config';
import { colors, spacing, radius, typography } from '../lib/theme';

const PRIVACY_POLICY_URL = 'https://v0-policy-training-privacy.vercel.app/';
const REFUND_POLICY_URL = 'https://policy-training-refund-policy.vercel.app/';

type Tab = 'terms' | 'privacy' | 'refund';

interface LegalScreenProps {
  initialTab?: Tab;
  onClose: () => void;
  currentUserId?: string;
  onDeleteComplete?: () => void;
}

const APP_NAME = 'Policy Training Platform';
const COMPANY_NAME = 'Lyfstyl Manufactures';
const SUPPORT_EMAIL = 'lyfstylmanufactures@gmail.com';
const LAST_UPDATED = 'September 14, 2026';

export default function LegalScreen({ initialTab = 'terms', onClose, currentUserId, onDeleteComplete }: LegalScreenProps) {
  const [activeTab, setActiveTab] = useState<Tab>(initialTab);
  const deleteMyAccount = useMutation(api.users.deleteMyAccount);

  const handleDeleteAccount = () => {
    if (!currentUserId) {
      Alert.alert('Sign in required', 'Please sign in before requesting account deletion.');
      return;
    }

    Alert.alert(
      'Delete account and data?',
      'This will permanently delete your account and all associated personal data. Reseller and affiliate links will be preserved. This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const result = await deleteMyAccount({ userId: currentUserId as any });
              onDeleteComplete?.();
              Alert.alert('Account Deleted', result.message || 'Your account was deleted successfully.');
              onClose();
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Unable to delete account right now.');
            }
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
          <MaterialIcons name="arrow-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {activeTab === 'terms' ? 'Terms of Service' : activeTab === 'privacy' ? 'Privacy Policy' : 'Refund Policy'}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'terms' && styles.tabActive]}
          onPress={() => setActiveTab('terms')}
        >
          <MaterialIcons
            name="gavel"
            size={18}
            color={activeTab === 'terms' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'terms' && styles.tabTextActive]}>
            {'Terms of Service'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'privacy' && styles.tabActive]}
          onPress={() => setActiveTab('privacy')}
        >
          <MaterialIcons
            name="privacy-tip"
            size={18}
            color={activeTab === 'privacy' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'privacy' && styles.tabTextActive]}>
            {'Privacy Policy'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'refund' && styles.tabActive]}
          onPress={() => setActiveTab('refund')}
        >
          <MaterialIcons
            name="receipt-long"
            size={18}
            color={activeTab === 'refund' ? colors.primary : colors.textTertiary}
          />
          <Text style={[styles.tabText, activeTab === 'refund' && styles.tabTextActive]}>
            {'Refund Policy'}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.lastUpdated}>{'Last Updated: ' + LAST_UPDATED}</Text>

        {activeTab === 'terms' ? <TermsContent /> : activeTab === 'privacy' ? <PrivacyContent /> : <RefundContent />}

        <View style={styles.contactBox}>
          <MaterialIcons name="email" size={20} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={styles.contactTitle}>{'Questions or Concerns?'}</Text>
            <Text style={styles.contactEmail}>{SUPPORT_EMAIL}</Text>
          </View>
        </View>

        {currentUserId ? (
          <TouchableOpacity style={styles.deleteButton} onPress={handleDeleteAccount}>
            <MaterialIcons name="delete-outline" size={20} color={colors.error} />
            <Text style={styles.deleteButtonText}>{'Delete my account and data'}</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.deleteHintBox}>
            <Text style={styles.deleteHintText}>{'Sign in to use the in-app delete button.'}</Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ number, title }: { number: string; title: string }) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionNumber}>
        <Text style={styles.sectionNumberText}>{number}</Text>
      </View>
      <Text style={styles.sectionTitle}>{title}</Text>
    </View>
  );
}

function P({ text }: { text: string }) {
  return <Text style={styles.paragraph}>{text}</Text>;
}

function B({ text }: { text: string }) {
  return (
    <View style={styles.bulletItem}>
      <View style={styles.bulletDot} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
  );
}

function PrivacyLinkButton() {
  return (
    <TouchableOpacity
      style={styles.externalLinkButton}
      onPress={() => Linking.openURL(PRIVACY_POLICY_URL)}
    >
      <MaterialIcons name="open-in-new" size={18} color={colors.primary} />
      <Text style={styles.externalLinkText}>{'Open hosted privacy policy'}</Text>
    </TouchableOpacity>
  );
}

function RefundLinkButton() {
  return (
    <TouchableOpacity
      style={styles.externalLinkButton}
      onPress={() => Linking.openURL(REFUND_POLICY_URL)}
    >
      <MaterialIcons name="open-in-new" size={18} color={colors.primary} />
      <Text style={styles.externalLinkText}>{'Open hosted refund policy'}</Text>
    </TouchableOpacity>
  );
}

function TermsContent() {
  return (
    <View>
      <SectionHeader number="1" title="Acceptance of Terms" />
      <P text={`By downloading, accessing, or using the ${APP_NAME} mobile application ("App"), you agree to be bound by these Terms of Service and the Privacy Policy. If you do not agree, do not use the App.`} />
      <P text={`These Terms form a binding agreement between you and ${COMPANY_NAME}. We may update them from time to time, and continued use of the App means you accept the changes.`} />

      <SectionHeader number="2" title="Eligibility and Account Responsibility" />
      <P text="You must be at least 18 years of age to use this App. You must provide accurate, current, and complete information when creating an account." />
      <B text="Keep your credentials secure and confidential" />
      <B text="You are responsible for activity on your account" />
      <B text="Tell us immediately if your account is compromised" />

      <SectionHeader number="3" title="Permitted Use" />
      <P text="This App is intended only for legitimate business, compliance, policy, training, inspection, and workplace communication purposes." />
      <B text="View and acknowledge company policies" />
      <B text="Complete quizzes and personal learning assignments" />
      <B text="Review role-based dashboards and summaries" />
      <B text="Use inspection workflows, photos, and history where your plan includes them" />
      <B text="Use in-app notifications and inbox messages for work-related alerts" />

      <SectionHeader number="4" title="Plan-Dependent Features" />
      <P text="Some features are available only on specific subscription packages. Package features and limits are shown in the app. Personal learning plans are included in every package, and Enterprise includes the full set of support, analytics, branding, and inspection features." />
      <P text="Your organization is responsible for choosing the package that matches its operational needs. We will make the features included in your active package available, subject to service availability and lawful use." />

      <SectionHeader number="5" title="Prohibited Use" />
      <P text="You may not use the App to:" />
      <B text="Upload unlawful, harmful, or misleading content" />
      <B text="Access data without permission" />
      <B text="Violate privacy, confidentiality, or data protection laws" />
      <B text="Interfere with security or performance" />
      <B text="Upload malware or attempt unauthorized technical access" />
      <B text="Harass, threaten, or impersonate other users" />

      <SectionHeader number="6" title="Business Data and POPIA" />
      <P text="If you use the App on behalf of a business, you confirm that you have authority to submit employee or business data and that your organization has a lawful basis to process that data." />
      <P text="We aim to support POPIA-aligned processing, including purpose limitation, data minimization, access control, security safeguards, and data subject participation." />

      <SectionHeader number="7" title="Privacy and Security" />
      <P text="We process personal information in accordance with our Privacy Policy. We use reasonable administrative, technical, and organisational safeguards, including hashed passwords, role-based access controls, and audit trails." />
      <B text="We do not sell personal information" />
      <B text="Access is limited to the minimum necessary for each role" />
      <B text="No system is perfectly secure; users must protect their own devices and credentials" />

      <SectionHeader number="8" title="Notifications and In-App Messages" />
      <P text="The App may send daily quiz reminders, overdue participation alerts after inactivity, weekly manager or supervisor summaries, inspection reminders, and account security notices." />
      <P text="If email delivery is unavailable, notifications may be delivered through the in-app inbox or notification center." />

      <SectionHeader number="9" title="AI Content Monitoring" />
      <P text="AI features are provided for informational and workflow support only. We may refuse unsafe, illegal, or harmful requests, and we may flag content for admin review where needed." />
      <B text="AI is not a substitute for legal, medical, HR, or psychological advice" />
      <B text="Businesses remain responsible for reviewing compliance outputs" />

      <SectionHeader number="10" title="Subscription and Payments" />
      <P text="If paid features are enabled, subscription terms, renewal rules, and app store payment conditions will apply. Refunds are handled by the applicable provider where permitted." />

      <SectionHeader number="11" title="Suspension and Termination" />
      <P text="We may suspend or terminate access if you violate these Terms, misuse data, breach security, or use the App for unlawful purposes." />

      <SectionHeader number="12" title="Limitation of Liability" />
      <P text={`The App is provided on an "as is" and "as available" basis. To the fullest extent permitted by law, ${COMPANY_NAME} is not liable for indirect, incidental, special, or consequential damages, except where liability cannot be excluded by law.`} />

      <SectionHeader number="13" title="Governing Law" />
      <P text="These Terms are governed by the laws of the Republic of South Africa. Disputes will be handled in the appropriate South African courts, subject to mandatory legal rights." />
    </View>
  );
}

function PrivacyContent() {
  return (
    <View>
      <PrivacyLinkButton />
      <SectionHeader number="1" title="Introduction" />
      <P text={`${COMPANY_NAME} is committed to protecting personal information for individuals and businesses. We process data lawfully, securely, and transparently.`} />
      <P text="This Privacy Policy is intended to align with the Protection of Personal Information Act, 2013 (POPIA)." />

      <SectionHeader number="2" title="Information We Collect" />
      <P text="We may collect the following information:" />
      <View style={styles.subSection}>
        <Text style={styles.subSectionTitle}>{'Account Information'}</Text>
        <B text="Name, email address, role, company affiliation, and login credentials" />
        <B text="Profile details such as job title, team, and preferences" />
      </View>
      <View style={styles.subSection}>
        <Text style={styles.subSectionTitle}>{'Training, Inspection, and Learning Data'}</Text>
        <B text="Quiz responses, completion status, and scores" />
        <B text="Policy acknowledgments and compliance records" />
        <B text="Learning requests, lesson progress, and quiz results" />
        <B text="Inspection submissions, photos, notes, and history" />
        <B text="Chat messages, support requests, and inbox notifications" />
        <B text="Usage, login, device, and diagnostic data" />
      </View>

      <SectionHeader number="3" title="How We Use Information" />
      <P text="We use information to provide the App, manage user access, deliver policies, quizzes, learning plans, inspections, reports, support compliance, and improve security." />
      <B text="Role-based dashboards and summaries" />
      <B text="Quiz reminders, learning prompts, and overdue alerts" />
      <B text="Weekly manager follow-up reporting" />
      <B text="Inspection history and compliance tracking" />
      <B text="Security, audit, and fraud prevention" />

      <SectionHeader number="4" title="Sharing and Disclosure" />
      <P text="We do not sell personal information. We may share data only where necessary with:" />
      <B text="The user's business or manager for compliance and training purposes" />
      <B text="Service providers that support hosting, messaging, analytics, and AI processing" />
      <B text="Authorities where required by law or court order" />

      <SectionHeader number="5" title="Security Safeguards" />
      <P text="We use reasonable safeguards such as encrypted transport, hashed passwords, access controls, and audit logs. Businesses should also secure their own devices, credentials, and internal access policies." />

      <SectionHeader number="6" title="Retention" />
      <P text="We keep personal information only as long as needed for the App, legal obligations, audit requirements, dispute resolution, or business compliance records." />

      <SectionHeader number="7" title="Your Rights" />
      <P text="Subject to POPIA and other applicable laws, you may request access, correction, deletion where permitted, objection to certain processing, or withdrawal of consent where applicable." />
      <P text={`To exercise these rights, use the in-app delete account button for full account deletion, or contact us at ${SUPPORT_EMAIL} for other privacy questions. We may need to verify your identity before responding.`} />

      <SectionHeader number="8" title="Cross-Border Processing" />
      <P text="Some data may be stored or processed outside South Africa depending on our service providers. Where this happens, we aim to use appropriate safeguards." />

      <SectionHeader number="9" title="Children" />
      <P text="This App is not intended for users under 18. We do not knowingly collect personal information from children." />

      <SectionHeader number="10" title="Changes" />
      <P text="We may update this Privacy Policy from time to time. Material changes will be reflected by updating the Last Updated date and publishing the revised policy in the App." />
    </View>
  );
}

function RefundContent() {
  return (
    <View>
      <RefundLinkButton />
      <SectionHeader number="1" title="Subscription Payments" />
      <P text="All subscription payments are processed securely through Paystack. By purchasing a subscription, you agree to the pricing, billing cycle, and renewal terms shown at checkout." />

      <SectionHeader number="2" title="Refund Eligibility" />
      <P text="Refunds are generally not automatic and are only considered in the following cases:" />
      <B text="You were charged in error" />
      <B text="You were billed multiple times for the same subscription" />
      <B text="A technical issue prevented access to the service after payment" />
      <B text="A refund is required by applicable law" />

      <SectionHeader number="3" title="Non-Refundable Cases" />
      <P text="We do not provide refunds for:" />
      <B text="Partial subscription periods" />
      <B text="Unused time on an active subscription" />
      <B text="Change of mind after purchase" />
      <B text="Failure to cancel before renewal" />
      <B text="Abuse, misuse, or violation of our terms" />

      <SectionHeader number="4" title="Subscription Cancellation" />
      <P text="You may cancel your subscription at any time. Cancellation stops future billing, but it does not automatically refund any previous charges unless the charge qualifies under this policy." />

      <SectionHeader number="5" title="Refund Request Process" />
      <P text="To request a refund, contact us with your full name, email address used for purchase, payment date, transaction reference or subscription code, and reason for the refund request. We may ask for additional information to verify your request." />

      <SectionHeader number="6" title="Refund Review Time" />
      <P text="Approved refunds are processed within a reasonable timeframe, depending on Paystack and your bank or card provider." />

      <SectionHeader number="7" title="Changes to This Policy" />
      <P text="We may update this Refund Policy from time to time. Any changes will be posted in the app or on our website." />

      <SectionHeader number="8" title="Contact Us" />
      <P text="If you have any questions about this Refund Policy, contact:" />
      <P text="Email: lyfstylmanufactures@gmail.com" />
      <P text="Company: Lyfstyl Manufactures" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    ...typography.h4,
    color: colors.text,
  },
  tabBar: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
  },
  tabActive: {
    backgroundColor: colors.primary + '15',
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.textTertiary,
  },
  tabTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
    paddingBottom: spacing.xxl,
  },
  lastUpdated: {
    ...typography.caption,
    color: colors.textTertiary,
    fontStyle: 'italic',
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
  },
  sectionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionNumberText: {
    ...typography.bodyMedium,
    color: colors.background,
    fontWeight: '700',
    fontSize: 13,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    flex: 1,
    fontSize: 18,
  },
  paragraph: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 24,
  },
  bulletItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingLeft: spacing.md,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
  },
  bulletText: {
    ...typography.body,
    color: colors.textSecondary,
    flex: 1,
    lineHeight: 22,
    fontSize: 14,
  },
  subSection: {
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  subSectionTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  externalLinkButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  externalLinkText: {
    ...typography.bodyMedium,
    color: colors.primary,
    fontWeight: '600',
  },
  contactBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
  },
  contactTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '600',
  },
  contactEmail: {
    ...typography.body,
    color: colors.primary,
    marginTop: spacing.xs,
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.error + '12',
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    marginTop: spacing.lg,
    borderWidth: 1,
    borderColor: colors.error + '33',
  },
  deleteButtonText: {
    ...typography.bodyMedium,
    color: colors.error,
    fontWeight: '700',
  },
  deleteHintBox: {
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  deleteHintText: {
    ...typography.body,
    color: colors.textSecondary,
  },
});
