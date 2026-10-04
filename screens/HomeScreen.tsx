import React, { useState, useContext } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList, TextInput, Alert, ActivityIndicator, Modal, Image, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { AuthContext } from '../lib/auth-context';
import { useBranding } from '../lib/branding-context';
import AppLogo from '../lib/AppLogo';
import { colors, spacing, radius, typography } from '../lib/theme';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../lib/config';
import type { Id } from '../lib/config';
import LegalScreen from './LegalScreen';

const DAILY_MOTIVATIONS = [
  "Every expert was once a beginner — keep showing up.",
  "Small daily improvements lead to stunning long-term results.",
  "You don't have to be perfect, just be consistent.",
  "Today's effort is tomorrow's expertise.",
  "The only bad training day is the one you skip.",
  "Growth happens one question at a time.",
  "Knowledge is the one thing nobody can take from you.",
  "You're building something powerful — one day at a time.",
  "Discipline today, confidence tomorrow.",
  "Progress, not perfection, is what matters.",
  "Your future self will thank you for today's effort.",
  "Learning never exhausts the mind — it ignites it.",
  "Stay curious, stay sharp, stay ahead.",
  "Champions are made in the daily grind.",
  "Every correct answer is proof you're growing.",
  "Invest in your mind — the returns are limitless.",
  "Showing up is half the battle. You already won.",
  "Be proud of how far you've come. Keep going.",
  "The more you learn, the more doors open.",
  "Consistency beats talent when talent doesn't show up.",
  "You're one quiz closer to mastery.",
  "Believe in the power of daily practice.",
  "Hard work compounds. Trust the process.",
  "Your dedication today sets the standard for tomorrow.",
  "Great things never come from comfort zones.",
  "A little progress each day adds up to big results.",
  "You are capable of more than you know.",
  "Success is the sum of small efforts repeated daily.",
  "Keep pushing — breakthroughs are closer than you think.",
  "Embrace the grind. It's shaping who you'll become.",
  "The best time to grow is right now.",
];

function getDailyMotivation(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_MOTIVATIONS[dayOfYear % DAILY_MOTIVATIONS.length];
}

type Props = { navigation: any };

export default function HomeScreen({ navigation }: Props) {
const auth = useContext(AuthContext);
const { user, signOut, updateUser } = auth ?? {};
const { branding } = useBranding();
const userId = user?.userId as Id<'users'> | undefined;
const companyId = user?.companyId as Id<'companies'> | undefined;
const packageInfo = useQuery(api.packages.getCompanyPackageInfo, companyId ? { companyId } : 'skip');
const packageFeatures = packageInfo?.features ?? [];
const hasPackageFeature = (feature: string) => packageFeatures.includes(feature);
const unread = useQuery(api.chat.getUnreadCount, userId ? { userId } : 'skip');
const learningRequests = useQuery(api.personalLearning.getUserLearningRequests, userId ? { userId } : 'skip');
const activeLearning = learningRequests?.find((request: any) => request.status === 'active');

// Get today's quizzes to show status on home screen
const todayQuizzes = useQuery(
  api.dailyQuizzes.getTodayQuizzes,
  companyId && userId ? { userId, companyId } : 'skip'
);
const todayScripts = useQuery(
  api.dailyQuizzes.getTodayScripts,
  companyId && userId ? { userId, companyId } : 'skip'
);

const [showInviteModal, setShowInviteModal] = useState(false);
const [inviteCode, setInviteCode] = useState('');
const [joining, setJoining] = useState(false);
const [showLegal, setShowLegal] = useState(false);
const [showSupport, setShowSupport] = useState(false);
const [supportSubject, setSupportSubject] = useState('');
const [supportMessage, setSupportMessage] = useState('');
const [sendingSupport, setSendingSupport] = useState(false);
const [showMyTickets, setShowMyTickets] = useState(false);

const joinCompany = useMutation(api.users.joinCompanyWithCode);
const submitSupport = useMutation(api.support.submitMessage);
const myTickets = useQuery(api.support.getMyMessages, userId ? { userId } : 'skip');
const logAppEvent = useMutation(api.support.logAppEvent);

const handleJoinCompany = async () => {
  if (!inviteCode.trim()) {
    Alert.alert('Required', 'Please enter an invite code');
    return;
  }
  if (!userId) return;
  setJoining(true);
  try {
    const result = await joinCompany({
      userId,
      inviteCode: inviteCode.trim().toUpperCase(),
    });
    // Update local user state with new company info
    await updateUser({ companyId: result.companyId as any, companyName: result.companyName });
    Alert.alert('Success!', `You've joined ${result.companyName}!`, [
      { text: 'OK', onPress: () => {
        setShowInviteModal(false);
        setInviteCode('');
      }}
    ]);
  } catch (error: any) {
    Alert.alert('Error', error.message || 'Failed to join company');
  } finally {
    setJoining(false);
  }
};

const handleSubmitSupport = async () => {
  if (!supportSubject.trim() || !supportMessage.trim()) {
    Alert.alert('Required', 'Please fill in both subject and message');
    return;
  }
  if (!userId) return;
  setSendingSupport(true);
  try {
    await submitSupport({
      userId,
      subject: supportSubject.trim(),
      message: supportMessage.trim(),
      metadata: {
        platform: Platform.OS,
        deviceModel: String(Platform.constants?.Model ?? ''),
        osVersion: String(Platform.Version),
        route: 'HomeScreen',
      },
    });
    void logAppEvent({
      category: 'usage',
      level: 'info',
      source: 'support.submit',
      message: 'Support message submitted',
      userId,
      companyId,
      metadata: {
        platform: Platform.OS,
        route: 'HomeScreen',
      },
    });
    Alert.alert('Sent!', 'Your message has been sent to our support team. We\'ll get back to you soon.', [
      { text: 'OK', onPress: () => {
        setShowSupport(false);
        setSupportSubject('');
        setSupportMessage('');
      }}
    ]);
  } catch (error: any) {
    void logAppEvent({
      category: 'error',
      level: 'error',
      source: 'support.submit',
      message: error?.message || 'Failed to send support message',
      userId,
      companyId,
      metadata: {
        platform: Platform.OS,
        route: 'HomeScreen',
      },
    });
    Alert.alert('Error', error.message || 'Failed to send message');
  } finally {
    setSendingSupport(false);
  }
};

const getStatusBadgeColor = (status: string) => {
  switch (status) {
    case 'open': return colors.warning;
    case 'replied': return colors.success;
    case 'closed': return colors.textTertiary;
    default: return colors.textSecondary;
  }
};

const stats = [
{ label: 'Policies Acknowledged', value: '8/12', icon: 'check-circle' },
{ label: 'Quiz Completion', value: '75%', icon: 'quiz' },
{ label: 'Compliance Score', value: '92%', icon: 'trending-up' },
];

const employeeShortcuts = [
  { key: 'inspections', title: 'Home Inspections', subtitle: 'Open your inspection tasks', icon: 'assignment-turned-in', route: 'MyInspections', requires: 'inspection_access' },
  { key: 'chat', title: 'Chat', subtitle: 'Open company messages', icon: 'chat', route: 'Chat' },
  { key: 'wellness', title: 'Wellness', subtitle: 'Support and check-ins', icon: 'favorite', route: 'Wellness', requires: 'wellness_chat' },
  { key: 'conflicts', title: 'Conflicts', subtitle: 'Resolve workplace issues', icon: 'handshake', route: 'Resolve', requires: 'conflict_resolution' },
  { key: 'quiz', title: 'Quiz', subtitle: 'Take your daily quiz', icon: 'quiz', route: 'Quiz', requires: 'daily_quizzes' },
  { key: 'compliance', title: 'Compliance', subtitle: 'Review policies and acknowledgements', icon: 'check-circle', route: 'Compliance' },
  { key: 'learning', title: 'Learning', subtitle: 'Access learning plans', icon: 'school', route: 'Learning', requires: 'personal_learning' },
].filter((item) => !item.requires || hasPackageFeature(item.requires));

const navigateToRoute = (route: string) => {
  navigation.navigate('EmployeeApp' as never, { screen: route as never });
};

const recentActivities = [
{ id: '1', type: 'policy', title: 'Code of Conduct Updated', time: '2h ago' },
{ id: '2', type: 'quiz', title: 'Data Privacy Quiz Completed', time: '1d ago' },
{ id: '3', type: 'policy', title: 'Security Policy Acknowledged', time: '3d ago' },
];

if (!auth) {
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.loadingState}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingStateText}>Loading your workspace...</Text>
      </View>
    </SafeAreaView>
  );
}

return (
<SafeAreaView style={styles.container} edges={['top']}>
<ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
<View style={styles.header}>
<View style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm, flex: 1 }}>
  <AppLogo size={36} showText={false} />
  <View>
    <Text style={styles.greeting}>Welcome, {user?.fullName}!</Text>
    {branding.displayName ? (
      <Text style={{ ...typography.caption, color: colors.textSecondary }}>{branding.displayName}</Text>
    ) : null}
  </View>
</View>
<View style={{ flexDirection: 'row', alignItems: 'center' }}>
  <TouchableOpacity
    style={styles.notificationBtn}
    onPress={() => navigateToRoute('Chat')}
  >
    <MaterialIcons name="notifications" size={22} color={colors.primary} />
    {!!unread && unread > 0 && (
      <View style={styles.notificationBadge}>
        <Text style={styles.notificationBadgeText}>{unread > 9 ? '9+' : unread}</Text>
      </View>
    )}
  </TouchableOpacity>
  {user?.role === 'manager' && (
    <TouchableOpacity style={styles.upgradeBtn} onPress={() => navigation.navigate('Paywall')}>
      <MaterialIcons name="upgrade" size={20} color={colors.background} />
      <Text style={styles.upgradeText}>Upgrade</Text>
    </TouchableOpacity>
  )}
  <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
    <MaterialIcons name="logout" size={20} color={colors.primary} />
  </TouchableOpacity>
</View>
</View>

{branding.brandStatement ? (
  <View style={[styles.motivationBanner, { borderLeftColor: colors.secondary, backgroundColor: colors.secondary + '10', marginBottom: spacing.md }]}>
    <MaterialIcons name="business" size={20} color={colors.secondary} />
    <Text style={{ ...typography.caption, color: colors.secondary, fontWeight: '600' }}>{branding.brandStatement}</Text>
  </View>
) : null}

{branding.welcomeMessage ? (
  <View style={[styles.infoBox, { marginBottom: spacing.lg }]}>
    <MaterialIcons name="campaign" size={20} color={colors.primary} />
    <Text style={{ ...typography.body, color: colors.text, flex: 1 }}>{branding.welcomeMessage}</Text>
  </View>
) : null}

{user?.companyId && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Quick Access</Text>
    <View style={styles.quickAccessGrid}>
      {employeeShortcuts.map((item) => (
        <TouchableOpacity
          key={item.key}
          style={styles.quickAccessCard}
          onPress={() => navigateToRoute(item.route)}
        >
          <MaterialIcons name={item.icon as any} size={22} color={colors.primary} />
          <Text style={styles.quickAccessTitle}>{item.title}</Text>
          <Text style={styles.quickAccessSubtitle}>{item.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </View>
  </View>
)}

{!user?.companyId && (
<TouchableOpacity style={styles.joinCompanyBanner} onPress={() => setShowInviteModal(true)}>
  <MaterialIcons name="business" size={28} color={colors.warning} />
  <View style={styles.pendingContent}>
    <Text style={styles.pendingTitle}>{user?.companyId ? 'Join a Group' : 'Join a Company'}</Text>
    <Text style={styles.pendingDesc}>{user?.companyId ? 'Enter invite code to join a group' : 'Enter an invite code from your manager'}</Text>
  </View>
  <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
)}

{activeLearning && (
  <View style={styles.section}>
    <Text style={styles.sectionTitle}>Active Learning</Text>
    <TouchableOpacity
      style={[styles.pendingCard, { borderColor: colors.primary, borderWidth: 1, backgroundColor: colors.primary + '08' }]}
      onPress={() => navigateToRoute('Learning')}
    >
      <MaterialIcons name="school" size={28} color={colors.primary} />
      <View style={styles.pendingContent}>
        <Text style={styles.pendingTitle}>{activeLearning.skill}</Text>
        <Text style={styles.pendingDesc}>In progress now — tap to continue your learning plan</Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
    </TouchableOpacity>
  </View>
)}

<View style={styles.statsContainer}>
{stats.map((stat, idx) => (
<View key={idx} style={styles.statCard}>
<MaterialIcons name={stat.icon as any} size={28} color={colors.primary} />
<Text style={styles.statValue}>{stat.value}</Text>
<Text style={styles.statLabel}>{stat.label}</Text>
</View>
))}
</View>

{/* Daily Motivation & Training */}
<View style={styles.section}>
  <View style={styles.motivationBanner}>
    <MaterialIcons name="lightbulb" size={24} color={colors.primary} />
    <View style={{ flex: 1 }}>
      <Text style={styles.motivationLabel}>Motivation of the Day</Text>
      <Text style={styles.motivationQuote}>{getDailyMotivation()}</Text>
    </View>
  </View>
</View>

{user?.companyId && (
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Today's Training</Text>
  <TouchableOpacity
    style={styles.pendingCard}
    onPress={() => navigation.navigate('Quiz')}
  >
    <MaterialIcons name="school" size={28} color={colors.primary} />
    <View style={styles.pendingContent}>
      <Text style={styles.pendingTitle}>Daily Quiz & Reading</Text>
      <Text style={styles.pendingDesc}>
        {todayQuizzes && todayQuizzes.length > 0
          ? `${todayQuizzes.filter((q: any) => q.completed).length}/${todayQuizzes.length} quiz(es) completed`
          : 'Loading today\'s training...'}
        {todayScripts && todayScripts.length > 0
          ? ` • ${todayScripts.filter((s: any) => s.isRead).length}/${todayScripts.length} reading(s) done`
          : ''}
      </Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
  </TouchableOpacity>
</View>
)}

{user?.companyId && (
<View style={styles.section}>
  <Text style={styles.sectionTitle}>Inspections</Text>
  <TouchableOpacity
    style={styles.pendingCard}
    onPress={() => navigateToRoute('MyInspections')}
  >
    <MaterialIcons name="assignment-turned-in" size={28} color={colors.primary} />
    <View style={styles.pendingContent}>
      <Text style={styles.pendingTitle}>My Inspections</Text>
      <Text style={styles.pendingDesc}>Daily, weekly, monthly, and before-use inspections</Text>
    </View>
    <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
  </TouchableOpacity>
</View>
)}

<View style={styles.section}>
<Text style={styles.sectionTitle}>Recent Activity</Text>
<FlatList
data={recentActivities}
keyExtractor={(item: { id: string }) => item.id}
scrollEnabled={false}
renderItem={({ item }: { item: { id: string; type: string; title: string; time: string } }) => (
<View style={styles.activityItem}>
<MaterialIcons
name={item.type === 'policy' ? 'description' : 'quiz'}
size={24}
color={colors.primary}
/>
<View style={styles.activityContent}>
<Text style={styles.activityTitle}>{item.title}</Text>
<Text style={styles.activityTime}>{item.time}</Text>
</View>
</View>
)}
/>
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>Pending Actions</Text>
<TouchableOpacity
style={styles.pendingCard}
onPress={() => navigation.navigate('Compliance')}
>
<MaterialIcons name="warning" size={28} color={colors.warning} />
<View style={styles.pendingContent}>
<Text style={styles.pendingTitle}>Policies Need Review</Text>
<Text style={styles.pendingDesc}>Tap to complete your acknowledgments</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>Messages</Text>
<TouchableOpacity
style={styles.pendingCard}
onPress={() => navigation.navigate('Chat')}
>
<MaterialIcons name="chat" size={28} color={colors.primary} />
<View style={styles.pendingContent}>
<Text style={styles.pendingTitle}>Chat</Text>
<Text style={styles.pendingDesc}>{unread ? `${unread} unread message(s)` : 'No unread messages'}</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>Legal</Text>
<TouchableOpacity
style={styles.pendingCard}
onPress={() => setShowLegal(true)}
>
<MaterialIcons name="gavel" size={28} color={colors.textSecondary} />
<View style={styles.pendingContent}>
<Text style={styles.pendingTitle}>Terms & Privacy Policy</Text>
<Text style={styles.pendingDesc}>View our terms of service and privacy policy</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
</View>

<View style={styles.section}>
<Text style={styles.sectionTitle}>Support</Text>
<TouchableOpacity
style={styles.pendingCard}
onPress={() => setShowSupport(true)}
>
<MaterialIcons name="support-agent" size={28} color={colors.primary} />
<View style={styles.pendingContent}>
<Text style={styles.pendingTitle}>Contact Support</Text>
<Text style={styles.pendingDesc}>Send a message to our team</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
{myTickets && myTickets.length > 0 && (
<TouchableOpacity
style={[styles.pendingCard, { marginTop: spacing.sm }]}
onPress={() => setShowMyTickets(true)}
>
<MaterialIcons name="inbox" size={28} color={colors.textSecondary} />
<View style={styles.pendingContent}>
<Text style={styles.pendingTitle}>My Support Tickets</Text>
<Text style={styles.pendingDesc}>{myTickets.length} ticket(s)</Text>
</View>
<MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
</TouchableOpacity>
)}
</View>
</ScrollView>

<Modal visible={showLegal} animationType="slide">
  <LegalScreen
    initialTab="terms"
    onClose={() => setShowLegal(false)}
    currentUserId={user?.userId}
    onDeleteComplete={signOut}
  />
</Modal>

{/* Support Form Modal */}
<Modal visible={showSupport} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={[styles.modalContent, { maxHeight: '80%' }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.md }}>
        <Text style={styles.modalTitle}>Contact Support</Text>
        <TouchableOpacity onPress={() => { setShowSupport(false); setSupportSubject(''); setSupportMessage(''); }}>
          <MaterialIcons name="close" size={24} color={colors.textSecondary} />
        </TouchableOpacity>
      </View>
      <Text style={[styles.modalSubtitle, { marginBottom: spacing.md }]}>Send a message and we'll respond in the app.</Text>
      <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>Subject</Text>
      <TextInput
        style={[styles.codeInput, { textAlign: 'left', letterSpacing: 0, fontFamily: undefined, ...typography.body }]}
        placeholder="What's this about?"
        placeholderTextColor={colors.textTertiary}
        value={supportSubject}
        onChangeText={setSupportSubject}
        autoCapitalize="sentences"
        maxLength={100}
      />
      <Text style={{ ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs }}>Message</Text>
      <TextInput
        style={[styles.codeInput, { textAlign: 'left', letterSpacing: 0, fontFamily: undefined, ...typography.body, height: 120, textAlignVertical: 'top' }]}
        placeholder="Describe your issue or question..."
        placeholderTextColor={colors.textTertiary}
        value={supportMessage}
        onChangeText={setSupportMessage}
        multiline
        numberOfLines={5}
        autoCapitalize="sentences"
        maxLength={2000}
      />
      <TouchableOpacity
        style={[styles.modalConfirmBtn, sendingSupport && { opacity: 0.6 }]}
        onPress={handleSubmitSupport}
        disabled={sendingSupport}
      >
        {sendingSupport ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={styles.modalConfirmText}>Send Message</Text>}
      </TouchableOpacity>
      <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.sm }}>
        Include app version, device details, and screenshots if needed.
      </Text>
    </View>
  </View>
</Modal>

{/* My Tickets Modal */}
<Modal visible={showMyTickets} animationType="slide">
  <SafeAreaView style={styles.container} edges={['top']}>
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: spacing.lg, paddingVertical: spacing.md, borderBottomWidth: 1, borderBottomColor: colors.border }}>
      <TouchableOpacity onPress={() => setShowMyTickets(false)}>
        <MaterialIcons name="arrow-back" size={24} color={colors.text} />
      </TouchableOpacity>
      <Text style={typography.h4}>My Support Tickets</Text>
      <View style={{ width: 24 }} />
    </View>
    <ScrollView style={{ flex: 1, padding: spacing.lg }}>
      {myTickets?.map((ticket: { _id: string; subject: string; message: string; status: 'open' | 'replied' | 'closed'; adminReply?: string; repliedAt?: number; createdAt: number }) => (
        <View key={ticket._id} style={{ backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.sm }}>
            <Text style={{ ...typography.bodyMedium, color: colors.text, flex: 1 }}>{ticket.subject}</Text>
            <View style={{ backgroundColor: getStatusBadgeColor(ticket.status) + '20', paddingHorizontal: spacing.sm, paddingVertical: 2, borderRadius: radius.sm }}>
              <Text style={{ ...typography.caption, color: getStatusBadgeColor(ticket.status), fontWeight: '600' }}>{ticket.status}</Text>
            </View>
          </View>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginBottom: spacing.sm }}>{ticket.message}</Text>
          <Text style={{ ...typography.caption, color: colors.textTertiary }}>{new Date(ticket.createdAt).toLocaleDateString()}</Text>
          {ticket.adminReply && (
            <View style={{ backgroundColor: colors.primary + '10', borderRadius: radius.md, padding: spacing.md, marginTop: spacing.sm }}>
              <Text style={{ ...typography.caption, color: colors.primary, fontWeight: '600', marginBottom: spacing.xs }}>Admin Reply</Text>
              <Text style={{ ...typography.body, color: colors.text }}>{ticket.adminReply}</Text>
              {ticket.repliedAt && <Text style={{ ...typography.caption, color: colors.textTertiary, marginTop: spacing.xs }}>{new Date(ticket.repliedAt).toLocaleDateString()}</Text>}
            </View>
          )}
        </View>
      ))}
      {(!myTickets || myTickets.length === 0) && (
        <Text style={{ ...typography.body, color: colors.textTertiary, textAlign: 'center', padding: spacing.xl }}>No support tickets yet</Text>
      )}
    </ScrollView>
  </SafeAreaView>
</Modal>

<Modal visible={showInviteModal} transparent animationType="slide">
  <View style={styles.modalOverlay}>
    <View style={styles.modalContent}>
      <Text style={styles.modalTitle}>{user?.companyId ? 'Join a Group' : 'Join a Company'}</Text>
      <Text style={styles.modalSubtitle}>{user?.companyId ? 'Enter the group invite code' : 'Enter the invite code your manager shared with you'}</Text>
      <TextInput
        style={styles.codeInput}
        placeholder="XXXXXXXX"
        placeholderTextColor={colors.textTertiary}
        value={inviteCode}
        onChangeText={(t: string) => setInviteCode(t.toUpperCase())}
        autoCapitalize="characters"
        maxLength={8}
      />
      <View style={styles.modalButtons}>
        <TouchableOpacity style={styles.modalCancelBtn} onPress={() => { setShowInviteModal(false); setInviteCode(''); }}>
          <Text style={styles.modalCancelText}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modalConfirmBtn, joining && { opacity: 0.6 }]}
          onPress={handleJoinCompany}
          disabled={joining}
        >
          {joining ? <ActivityIndicator color={colors.background} size="small" /> : <Text style={styles.modalConfirmText}>Join</Text>}
        </TouchableOpacity>
      </View>
    </View>
  </View>
</Modal>
</SafeAreaView>
);
}

const styles = StyleSheet.create({
container: {
flex: 1,
backgroundColor: colors.background,
},
scroll: {
flex: 1,
paddingHorizontal: spacing.lg,
},
header: {
flexDirection: 'row',
justifyContent: 'space-between',
alignItems: 'center',
marginBottom: spacing.xl,
marginTop: spacing.lg,
},
greeting: {
...typography.h3,
color: colors.text,
},
notificationBtn: {
  position: 'relative',
  padding: spacing.sm,
  marginRight: spacing.xs,
},
notificationBadge: {
  position: 'absolute',
  top: 0,
  right: 0,
  minWidth: 16,
  height: 16,
  borderRadius: radius.full,
  backgroundColor: colors.error,
  alignItems: 'center',
  justifyContent: 'center',
  paddingHorizontal: 3,
},
notificationBadgeText: {
  ...typography.caption,
  color: colors.background,
  fontSize: 10,
  fontWeight: '700',
  lineHeight: 12,
},
signOutBtn: {
padding: spacing.sm,
},
upgradeBtn: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: spacing.xs,
  backgroundColor: colors.primary,
  borderRadius: radius.full,
  paddingHorizontal: spacing.md,
  paddingVertical: spacing.sm,
  marginRight: spacing.sm,
},
upgradeText: {
  ...typography.caption,
  color: colors.background,
  fontWeight: '700',
},
joinCompanyBanner: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.warning + '15',
  borderRadius: radius.lg,
  padding: spacing.md,
  marginBottom: spacing.xl,
  borderWidth: 1,
  borderColor: colors.warning + '30',
  gap: spacing.md,
},
statsContainer: {
flexDirection: 'row',
gap: spacing.md,
marginBottom: spacing.xl,
},
statCard: {
flex: 1,
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.md,
alignItems: 'center',
borderWidth: 1,
borderColor: colors.border,
},
statValue: {
...typography.h4,
color: colors.primary,
marginTop: spacing.sm,
},
statLabel: {
...typography.caption,
color: colors.textSecondary,
marginTop: spacing.xs,
textAlign: 'center',
},
section: {
marginBottom: spacing.xl,
},
sectionTitle: {
...typography.h4,
color: colors.text,
marginBottom: spacing.md,
},
activityItem: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: radius.md,
padding: spacing.md,
marginBottom: spacing.sm,
gap: spacing.md,
borderLeftWidth: 4,
borderLeftColor: colors.primary,
},
activityContent: {
flex: 1,
},
activityTitle: {
...typography.bodyMedium,
color: colors.text,
},
activityTime: {
...typography.caption,
color: colors.textSecondary,
marginTop: spacing.xs,
},
pendingCard: {
flexDirection: 'row',
alignItems: 'center',
backgroundColor: colors.surface,
borderRadius: radius.lg,
padding: spacing.md,
borderWidth: 1,
borderColor: colors.border,
gap: spacing.md,
},
pendingContent: {
flex: 1,
},
pendingTitle: {
...typography.bodyMedium,
color: colors.text,
},
pendingDesc: {
...typography.caption,
color: colors.textSecondary,
marginTop: spacing.xs,
},
quickAccessGrid: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: spacing.md,
},
quickAccessCard: {
  width: '48%',
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  padding: spacing.md,
  gap: spacing.xs,
  borderWidth: 1,
  borderColor: colors.border,
},
quickAccessTitle: {
  ...typography.bodyMedium,
  color: colors.text,
  fontWeight: '600',
},
quickAccessSubtitle: {
  ...typography.caption,
  color: colors.textSecondary,
},
motivationBanner: {
  flexDirection: 'row',
  alignItems: 'flex-start',
  backgroundColor: colors.primary + '10',
  borderRadius: radius.lg,
  padding: spacing.md,
  borderLeftWidth: 4,
  borderLeftColor: colors.primary,
  gap: spacing.md,
},
motivationLabel: {
  ...typography.caption,
  color: colors.primary,
  fontWeight: '700',
  textTransform: 'uppercase',
  letterSpacing: 1,
  marginBottom: spacing.xs,
},
motivationQuote: {
  ...typography.body,
  color: colors.text,
  fontStyle: 'italic',
  lineHeight: 22,
},
infoBox: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: colors.surface,
  borderRadius: radius.lg,
  padding: spacing.md,
  gap: spacing.md,
},
loadingState: {
  flex: 1,
  alignItems: 'center',
  justifyContent: 'center',
  gap: spacing.md,
},
loadingStateText: {
  ...typography.body,
  color: colors.textSecondary,
},
modalOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
},
modalContent: {
  backgroundColor: colors.background,
  borderRadius: radius.lg,
  padding: spacing.xl,
  width: '90%',
  maxWidth: 400,
},
modalTitle: {
  ...typography.h3,
  color: colors.text,
  marginBottom: spacing.xs,
},
modalSubtitle: {
  ...typography.caption,
  color: colors.textSecondary,
  marginBottom: spacing.lg,
},
codeInput: {
  backgroundColor: colors.surface,
  borderRadius: radius.md,
  padding: spacing.md,
  ...typography.h3,
  color: colors.text,
  textAlign: 'center',
  letterSpacing: 4,
  fontFamily: 'monospace',
  borderWidth: 1,
  borderColor: colors.border,
  marginBottom: spacing.lg,
},
modalButtons: {
  flexDirection: 'row',
  gap: spacing.md,
},
modalCancelBtn: {
  flex: 1,
  padding: spacing.md,
  borderRadius: radius.md,
  backgroundColor: colors.surface,
  alignItems: 'center',
},
modalCancelText: {
  ...typography.body,
  color: colors.textSecondary,
},
modalConfirmBtn: {
  flex: 1,
  padding: spacing.md,
  borderRadius: radius.md,
  backgroundColor: colors.primary,
  alignItems: 'center',
},
modalConfirmText: {
  ...typography.body,
  color: colors.background,
  fontWeight: '600',
},
});