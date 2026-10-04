import React, { useEffect, useState, useContext } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
  Share,
  Switch,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import type { Id } from '../lib/config';
import LegalScreen from './LegalScreen';

export default function ManagerDashboardHome({ navigation }: any) {
  const auth = useContext(AuthContext);
  const { signOut, user } = auth ?? {};
  const companyId = user?.companyId as Id<'companies'> | undefined;
  const userId = user?.userId as Id<'users'> | undefined;

  const [showGroupModal, setShowGroupModal] = useState(false);
  const [showPolicyModal, setShowPolicyModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [showLegal, setShowLegal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupDescription, setNewGroupDescription] = useState('');
  const [policyTitle, setPolicyTitle] = useState('');
  const [policyContent, setPolicyContent] = useState('');
  const [policyType, setPolicyType] = useState<'general' | 'group'>('general');
  const [selectedGroupIds, setSelectedGroupIds] = useState<Id<'employeeGroups'>[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedNotification, setSelectedNotification] = useState<any>(null);
  const [settingsQuestionCount, setSettingsQuestionCount] = useState('5');
  const [settingsQuizStyle, setSettingsQuizStyle] = useState<'original' | 'scenario' | 'truefalse' | 'quickcheck'>('original');
  const [settingsWellnessEnabled, setSettingsWellnessEnabled] = useState(false);
  const [settingsConflictResolutionEnabled, setSettingsConflictResolutionEnabled] = useState(false);

  const employees = useQuery(api.users.getCompanyEmployees, companyId && userId ? { companyId, userId } : 'skip');
  const groups = useQuery(api.users.getCompanyGroups, companyId && userId ? { companyId, userId } : 'skip');
  const policies = useQuery(api.policies.listCompanyPolicies, companyId && userId ? { companyId, userId } : 'skip');
  const weeklyQuizStats = useQuery(
    api.dailyQuizzes.getCompanyWeeklyQuizStats,
    companyId && userId ? { companyId, userId } : 'skip'
  );
  const companyFeatures = useQuery(api.users.getCompanyFeatures, companyId ? { companyId } : 'skip');
  const companyQuizSettings = useQuery(
    api.users.getCompanyQuizSettings,
    companyId ? { companyId } : 'skip'
  );
  const quizQuestionLimit = companyQuizSettings?.maxQuestionCount ?? 5;
  const professionals = useQuery(api.professionals.getCompanyProfessionals, companyId ? { companyId } : 'skip');
  const notifications = useQuery(
    api.dailyQuizzes.getManagerNotifications,
    userId ? { managerId: userId } : 'skip'
  );
  const unreadCount = useQuery(
    api.dailyQuizzes.getUnreadNotificationCount,
    userId ? { managerId: userId } : 'skip'
  );
  const history = useQuery(
    api.packages.getPackageHistory,
    companyId ? { companyId } : 'skip'
  );

  const createInviteCode = useMutation(api.users.createInviteCode);
  const createGroup = useMutation(api.users.createEmployeeGroup);
  const uploadPolicy = useMutation(api.policies.uploadPolicy);
  const markNotificationRead = useMutation(api.dailyQuizzes.markNotificationRead);
  const updateCompanyQuizSettings = useMutation(api.users.updateCompanyQuizSettings);
  const updateCompanyFeatures = useMutation(api.users.updateCompanyFeatures);

  useEffect(() => {
    if (companyQuizSettings) {
      setSettingsQuestionCount(String(companyQuizSettings.questionCount || 5));
      setSettingsQuizStyle(companyQuizSettings.quizStyle);
    }
  }, [companyQuizSettings]);

  useEffect(() => {
    if (companyFeatures) {
      setSettingsWellnessEnabled(companyFeatures.wellnessEnabled);
      setSettingsConflictResolutionEnabled(companyFeatures.conflictResolutionEnabled);
    }
  }, [companyFeatures]);

  const handleCreateInvite = async (groupId?: Id<'employeeGroups'>) => {
    if (!companyId || !userId) return;
    try {
      const result = await createInviteCode({ companyId, createdBy: userId, groupId });
      Alert.alert('Invite Code Created', `Code: ${result.code}`, [
        {
          text: 'Share',
          onPress: () =>
            Share.share({
              message: `Join our company using invite code: ${result.code}`,
            }),
        },
        { text: 'OK' },
      ]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create invite code');
    }
  };

  const handleCreateGroup = async () => {
    if (!companyId || !userId) return;
    if (!newGroupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }
    setIsSaving(true);
    try {
      await createGroup({
        name: newGroupName.trim(),
        companyId,
        createdBy: userId,
        description: newGroupDescription.trim() || undefined,
      });
      setNewGroupName('');
      setNewGroupDescription('');
      setShowGroupModal(false);
      Alert.alert('Success', 'Group created successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to create group');
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadPolicy = async () => {
    if (!companyId || !userId) return;
    if (!policyTitle.trim() || !policyContent.trim()) {
      Alert.alert('Error', 'Please fill in title and policy content');
      return;
    }
    if (policyType === 'group' && selectedGroupIds.length === 0) {
      Alert.alert('Error', 'Please select at least one group');
      return;
    }
    setIsSaving(true);
    try {
      await uploadPolicy({
        title: policyTitle.trim(),
        description: undefined,
        content: policyContent.trim(),
        fileType: 'txt',
        fileUrl: 'manual-entry',
        companyId,
        uploadedBy: userId,
        policyType,
        targetGroupIds: policyType === 'group' ? selectedGroupIds : undefined,
      });
      setPolicyTitle('');
      setPolicyContent('');
      setPolicyType('general');
      setSelectedGroupIds([]);
      setShowPolicyModal(false);
      Alert.alert('Saved', 'Policy added successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save policy');
    } finally {
      setIsSaving(false);
    }
  };

  const toggleGroupSelection = (groupId: Id<'employeeGroups'>) => {
    setSelectedGroupIds((current: Id<'employeeGroups'>[]) =>
      current.includes(groupId) ? current.filter((id: Id<'employeeGroups'>) => id !== groupId) : [...current, groupId]
    );
  };

  const openNotification = async (notif: any) => {
    setSelectedNotification(notif);
    if (!notif.isRead) {
      try {
        await markNotificationRead({ notificationId: notif._id });
      } catch (error: any) {
        Alert.alert('Error', error.message || 'Failed to open alert');
      }
    }
  };

  const saveSettings = async () => {
    if (!companyId) return;
    setIsSaving(true);
    try {
      await updateCompanyQuizSettings({
        companyId,
        userId,
        questionCount: Number(settingsQuestionCount) || 5,
        quizStyle: settingsQuizStyle,
      });

      await updateCompanyFeatures({
        companyId,
        userId,
        wellnessEnabled: settingsWellnessEnabled,
        conflictResolutionEnabled: settingsConflictResolutionEnabled,
      });

      setShowSettingsModal(false);
      Alert.alert('Saved', 'Settings updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  if (!auth) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading manager tools...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>{user?.companyName || 'My Company'}</Text>
          <Text style={styles.subtitle}>Manager Dashboard</Text>
        </View>
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.notificationBtn}
            onPress={() => {
              const firstUnread = notifications?.find((notif: any) => !notif.isRead) || notifications?.[0];
              if (firstUnread) {
                void openNotification(firstUnread);
              }
            }}
          >
            <MaterialIcons name="notifications" size={24} color={colors.primary} />
            {!!unreadCount && unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>{unreadCount > 9 ? '9+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity onPress={signOut} style={styles.logoutBtn}>
            <MaterialIcons name="logout" size={18} color={colors.error} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <View style={styles.infoBox}>
          <MaterialIcons name="auto-awesome" size={20} color={colors.success} />
          <Text style={styles.infoText}>Manage your company, packages, and company alerts here.</Text>
        </View>

        <TouchableOpacity style={styles.logoutCard} onPress={signOut}>
          <MaterialIcons name="logout" size={20} color={colors.error} />
          <Text style={styles.logoutCardText}>Logout</Text>
        </TouchableOpacity>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <MaterialIcons name="people" size={30} color={colors.primary} />
            <Text style={styles.statValue}>{employees?.length || 0}</Text>
            <Text style={styles.statLabel}>Employees</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="folder" size={30} color={colors.secondary} />
            <Text style={styles.statValue}>{groups?.length || 0}</Text>
            <Text style={styles.statLabel}>Groups</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="description" size={30} color={colors.success} />
            <Text style={styles.statValue}>{policies?.length || 0}</Text>
            <Text style={styles.statLabel}>Policies</Text>
          </View>
          <View style={styles.statCard}>
            <MaterialIcons name="smart-toy" size={30} color={colors.warning} />
            <Text style={styles.statValue}>AI</Text>
            <Text style={styles.statLabel}>Quiz Generator</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quiz Stats</Text>
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>Weekly</Text>
            </View>
          </View>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <MaterialIcons name="check-circle" size={24} color={colors.success} />
              <Text style={styles.statValue}>{weeklyQuizStats?.passingCount || 0}</Text>
              <Text style={styles.statLabel}>Passing</Text>
            </View>
            <View style={styles.statCard}>
              <MaterialIcons name="cancel" size={24} color={colors.error} />
              <Text style={styles.statValue}>{weeklyQuizStats?.failingCount || 0}</Text>
              <Text style={styles.statLabel}>Failing</Text>
            </View>
          </View>
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.quickGrid}>
            <TouchableOpacity style={styles.quickCard} onPress={() => handleCreateInvite()}>
              <MaterialIcons name="person-add" size={22} color={colors.primary} />
              <Text style={styles.quickTitle}>Invite Employee</Text>
              <Text style={styles.quickSubtitle}>Generate and share invite codes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => setShowGroupModal(true)}>
              <MaterialIcons name="create-new-folder" size={22} color={colors.primary} />
              <Text style={styles.quickTitle}>Create Group</Text>
              <Text style={styles.quickSubtitle}>Organize employees by role</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => setShowPolicyModal(true)}>
              <MaterialIcons name="add-circle" size={22} color={colors.primary} />
              <Text style={styles.quickTitle}>Add Policy</Text>
              <Text style={styles.quickSubtitle}>Upload or paste policy content</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('PackageManagement')}>
              <MaterialIcons name="workspace-premium" size={22} color={colors.primary} />
              <Text style={styles.quickTitle}>Package</Text>
              <Text style={styles.quickSubtitle}>View billing and plan details</Text>
           </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => setShowLegal(true)}>
              <MaterialIcons name="gavel" size={22} color={colors.primary} />
              <Text style={styles.quickTitle}>Policies</Text>
              <Text style={styles.quickSubtitle}>Terms, privacy, and refund policy</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('InspectionTemplates')}>
              <MaterialIcons name="assignment" size={22} color={colors.primary} />
              <Text style={styles.quickTitle}>Templates</Text>
              <Text style={styles.quickSubtitle}>Create inspection templates</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('InspectionEquipmentAssignment')}>
              <MaterialIcons name="event-repeat" size={22} color={colors.primary} />
              <Text style={styles.quickTitle}>Assign Inspection</Text>
              <Text style={styles.quickSubtitle}>Assign inspections by frequency</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.quickCard} onPress={() => navigation.navigate('InspectionHistory')}>
              <MaterialIcons name="history" size={22} color={colors.primary} />
              <Text style={styles.quickTitle}>Inspection History</Text>
              <Text style={styles.quickSubtitle}>View past inspections</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Alerts & Notifications</Text>
            <View style={styles.alertBadge}>
              <Text style={styles.alertBadgeText}>{unreadCount || 0} new</Text>
            </View>
          </View>
          <Text style={styles.sectionMeta}>Company updates and alerts appear here.</Text>
          {notifications && notifications.length > 0 ? (
            notifications.slice(0, 3).map((notif: any) => (
              <TouchableOpacity
                key={notif._id}
                style={[styles.notificationRow, !notif.isRead && styles.notificationRowUnread]}
                onPress={() => { void openNotification(notif); }}
              >
                <MaterialIcons
                  name={
                    notif.type === 'payment_approved'
                      ? 'check-circle'
                      : notif.type === 'payment_rejected'
                      ? 'cancel'
                      : notif.type === 'quiz_failure'
                      ? 'warning'
                      : 'info'
                  }
                  size={22}
                  color={
                    notif.type === 'payment_approved'
                      ? colors.success
                      : notif.type === 'payment_rejected'
                      ? colors.error
                      : notif.type === 'quiz_failure'
                      ? colors.warning
                      : colors.primary
                  }
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.notificationTitle}>{notif.title}</Text>
                  <Text style={styles.notificationMeta}>{notif.employeeName} • {new Date(notif.createdAt).toLocaleDateString()}</Text>
                </View>
                {!notif.isRead && <View style={styles.notificationDot} />}
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.emptyAlertText}>No alerts right now.</Text>
          )}
        </View>

        <Modal visible={!!selectedNotification} transparent animationType="slide" onRequestClose={() => setSelectedNotification(null)}>
          <View style={styles.modalOverlay}>
            <View style={styles.alertDetailCard}>
              <View style={styles.alertDetailHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.alertDetailTitle}>{selectedNotification?.title}</Text>
                  <Text style={styles.alertDetailMeta}>
                    {selectedNotification?.employeeName} • {selectedNotification ? new Date(selectedNotification.createdAt).toLocaleDateString() : ''}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setSelectedNotification(null)}>
                  <MaterialIcons name="close" size={24} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.alertSummaryBox}>
                <Text style={styles.alertSummaryLabel}>Summary</Text>
                <Text style={styles.alertSummaryText}>{selectedNotification?.message}</Text>
              </View>

              <View style={styles.alertMetaRow}>
                <Text style={styles.alertMetaLabel}>Type</Text>
                <Text style={styles.alertMetaValue}>{selectedNotification?.type?.replace('_', ' ')}</Text>
              </View>

              <TouchableOpacity style={styles.modalBtnPrimary} onPress={() => setSelectedNotification(null)}>
                <Text style={styles.modalBtnPrimaryText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Professional Support</Text>
            <TouchableOpacity onPress={() => navigation.navigate('ProfessionalsManagement')}>
              <Text style={styles.linkText}>Open</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionMeta}>{professionals?.length || 0} saved contacts</Text>
          <View style={styles.inlineRow}>
            <Text style={styles.inlineLabel}>Counselors</Text>
            <Text style={styles.inlineValue}>{professionals?.filter((p: any) => p.type === 'counselor').length || 0}</Text>
          </View>
          <View style={styles.inlineRow}>
            <Text style={styles.inlineLabel}>Psychologists</Text>
            <Text style={styles.inlineValue}>{professionals?.filter((p: any) => p.type === 'psychologist').length || 0}</Text>
          </View>
          <View style={styles.inlineRow}>
            <Text style={styles.inlineLabel}>Lawyers</Text>
            <Text style={styles.inlineValue}>{professionals?.filter((p: any) => p.type === 'lawyer').length || 0}</Text>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Settings</Text>
            <TouchableOpacity onPress={() => setShowSettingsModal(true)}>
              <Text style={styles.linkText}>Open</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.sectionMeta}>Quiz style and company features.</Text>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Questions per quiz</Text>
            <Text style={styles.settingsValue}>{companyQuizSettings?.questionCount || 5} / {quizQuestionLimit}</Text>
          </View>
          <View style={styles.settingsRow}>
            <Text style={styles.settingsLabel}>Quiz style</Text>
            <Text style={styles.settingsValue}>{companyQuizSettings?.quizStyle || 'original'}</Text>
          </View>
        </View>
      </ScrollView>

     <Modal visible={showLegal} animationType="slide" onRequestClose={() => setShowLegal(false)}>
        <LegalScreen
          initialTab="terms"
          onClose={() => setShowLegal(false)}
          currentUserId={user?.userId}
          onDeleteComplete={signOut}
        />
      </Modal>

      <TouchableOpacity style={styles.floatingLogoutBtn} onPress={signOut}>
        <MaterialIcons name="logout" size={22} color={colors.background} />
        <Text style={styles.floatingLogoutText}>Logout</Text>
      </TouchableOpacity>

      <Modal visible={showSettingsModal} transparent animationType="slide" onRequestClose={() => setShowSettingsModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <View style={styles.sectionHeader}>
              <Text style={styles.modalTitle}>Manager Settings</Text>
              <TouchableOpacity onPress={() => setShowSettingsModal(false)}>
                <MaterialIcons name="close" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text style={styles.inputLabel}>Questions per quiz</Text>
            <TextInput
              style={styles.input}
              keyboardType="number-pad"
              value={settingsQuestionCount}
              onChangeText={setSettingsQuestionCount}
              placeholderTextColor={colors.textTertiary}
            />

            <Text style={styles.inputLabel}>Quiz style</Text>
            <View style={styles.policyTypeRow}>
              {(['original', 'scenario', 'truefalse', 'quickcheck'] as const).map((style) => (
                <TouchableOpacity
                  key={style}
                  style={[styles.policyTypeBtn, settingsQuizStyle === style && styles.policyTypeBtnActive]}
                  onPress={() => setSettingsQuizStyle(style)}
                >
                  <Text style={[styles.policyTypeText, settingsQuizStyle === style && styles.policyTypeTextActive]}>
                    {style}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={styles.inputLabel}>Feature toggles</Text>
            <View style={styles.settingsSwitchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>Wellness chat</Text>
                <Text style={styles.sectionMeta}>Allow managers and staff to use wellness support.</Text>
              </View>
              <Switch
                value={settingsWellnessEnabled}
                onValueChange={setSettingsWellnessEnabled}
                trackColor={{ false: colors.border, true: colors.primary + '55' }}
                thumbColor={settingsWellnessEnabled ? colors.primary : colors.textTertiary}
              />
            </View>
            <View style={styles.settingsSwitchRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.settingsLabel}>Conflict resolution</Text>
                <Text style={styles.sectionMeta}>Enable conflict resolution tools for the company.</Text>
              </View>
              <Switch
                value={settingsConflictResolutionEnabled}
                onValueChange={setSettingsConflictResolutionEnabled}
                trackColor={{ false: colors.border, true: colors.primary + '55' }}
                thumbColor={settingsConflictResolutionEnabled ? colors.primary : colors.textTertiary}
              />
            </View>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => setShowSettingsModal(false)}
                disabled={isSaving}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={saveSettings} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalBtnPrimaryText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showGroupModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create Group</Text>
            <TextInput
              style={styles.input}
              placeholder="Group name"
              value={newGroupName}
              onChangeText={setNewGroupName}
              placeholderTextColor={colors.textTertiary}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Group description"
              value={newGroupDescription}
              onChangeText={setNewGroupDescription}
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  setShowGroupModal(false);
                  setNewGroupName('');
                  setNewGroupDescription('');
                }}
                disabled={isSaving}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleCreateGroup} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalBtnPrimaryText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showPolicyModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContentLarge}>
            <Text style={styles.modalTitle}>Add Policy</Text>
            <TextInput
              style={styles.input}
              placeholder="Policy title"
              value={policyTitle}
              onChangeText={setPolicyTitle}
              placeholderTextColor={colors.textTertiary}
            />
            <TextInput
              style={[styles.input, styles.textArea]}
              placeholder="Paste policy content"
              value={policyContent}
              onChangeText={setPolicyContent}
              placeholderTextColor={colors.textTertiary}
              multiline
            />
            <Text style={styles.inputLabel}>Policy Type</Text>
            <View style={styles.policyTypeRow}>
              <TouchableOpacity
                style={[styles.policyTypeBtn, policyType === 'general' && styles.policyTypeBtnActive]}
                onPress={() => setPolicyType('general')}
              >
                <Text style={[styles.policyTypeText, policyType === 'general' && styles.policyTypeTextActive]}>General</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.policyTypeBtn, policyType === 'group' && styles.policyTypeBtnActive]}
                onPress={() => setPolicyType('group')}
              >
                <Text style={[styles.policyTypeText, policyType === 'group' && styles.policyTypeTextActive]}>Group</Text>
              </TouchableOpacity>
            </View>
            {policyType === 'group' && (
              <>
                <Text style={styles.inputLabel}>Select Groups</Text>
                <View style={styles.groupSelectContainer}>
                  {groups?.map((group: any) => (
                    <TouchableOpacity
                      key={group._id}
                      style={[
                        styles.groupSelectBtn,
                        selectedGroupIds.includes(group._id) && styles.groupSelectBtnActive,
                      ]}
                      onPress={() => toggleGroupSelection(group._id)}
                    >
                      <MaterialIcons
                        name={selectedGroupIds.includes(group._id) ? 'check-box' : 'check-box-outline-blank'}
                        size={20}
                        color={selectedGroupIds.includes(group._id) ? colors.primary : colors.textTertiary}
                      />
                      <Text style={styles.groupSelectText}>{group.name}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalBtnSecondary}
                onPress={() => {
                  setShowPolicyModal(false);
                  setPolicyTitle('');
                  setPolicyContent('');
                  setPolicyType('general');
                  setSelectedGroupIds([]);
                }}
                disabled={isSaving}
              >
                <Text style={styles.modalBtnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalBtnPrimary} onPress={handleUploadPolicy} disabled={isSaving}>
                {isSaving ? <ActivityIndicator color={colors.background} /> : <Text style={styles.modalBtnPrimaryText}>Save</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { ...typography.h2, color: colors.text },
  subtitle: { ...typography.caption, color: colors.textSecondary },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  logoutCard: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.lg, paddingVertical: spacing.md, marginBottom: spacing.md, borderWidth: 1, borderColor: colors.border },
  logoutCardText: { ...typography.body, color: colors.error, fontWeight: '700' },
  logoutBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  logoutText: { ...typography.caption, color: colors.error, fontWeight: '700' },
  notificationBtn: { position: 'relative', padding: spacing.sm },
  notificationBadge: { position: 'absolute', top: 2, right: 2, minWidth: 16, height: 16, borderRadius: radius.full, backgroundColor: colors.error, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 3 },
  notificationBadgeText: { ...typography.caption, color: colors.background, fontSize: 10, fontWeight: '700', lineHeight: 12 },
  content: { flex: 1 },
  contentContainer: { padding: spacing.lg, paddingBottom: spacing.xl * 2 },
  footerLogoutWrap: { paddingHorizontal: spacing.lg, paddingBottom: spacing.md, backgroundColor: colors.background },
  footerLogoutBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: spacing.sm, paddingVertical: spacing.md, borderRadius: radius.lg, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  footerLogoutText: { ...typography.body, color: colors.error, fontWeight: '700' },
  floatingLogoutBtn: { position: 'absolute', right: spacing.lg, bottom: spacing.xl + 72, flexDirection: 'row', alignItems: 'center', gap: spacing.sm, backgroundColor: colors.error, paddingHorizontal: spacing.md, paddingVertical: spacing.md, borderRadius: radius.full, elevation: 4, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  floatingLogoutText: { ...typography.body, color: colors.background, fontWeight: '700' },
  alertCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg, gap: spacing.sm, borderLeftWidth: 4 },
  alertTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  alertText: { ...typography.caption, color: colors.textSecondary },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginBottom: spacing.lg },
  statCard: { width: '47%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, alignItems: 'center', justifyContent: 'center' },
  statValue: { ...typography.h2, color: colors.text, marginTop: spacing.xs },
  statLabel: { ...typography.caption, color: colors.textSecondary },
  quickActions: { marginBottom: spacing.lg },
  sectionTitle: { ...typography.h4, color: colors.text },
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.md, marginTop: spacing.md },
  quickCard: { width: '48%', backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, gap: spacing.xs },
  quickTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  quickSubtitle: { ...typography.caption, color: colors.textSecondary },
  policyTypeRow: { flexDirection: 'row', gap: spacing.sm, marginBottom: spacing.md },
  policyTypeBtn: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center', borderWidth: 1, borderColor: colors.border },
  policyTypeBtnActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  policyTypeText: { ...typography.body, color: colors.text, fontWeight: '600' },
  policyTypeTextActive: { color: colors.background },
  groupSelectContainer: { gap: spacing.sm, marginBottom: spacing.md },
  groupSelectBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, padding: spacing.md, borderRadius: radius.md, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  groupSelectBtnActive: { backgroundColor: colors.primary + '15', borderColor: colors.primary },
  groupSelectText: { ...typography.body, color: colors.text },
  infoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.sm, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.lg },
  infoText: { ...typography.caption, color: colors.textSecondary, flex: 1 },
  sectionCard: { backgroundColor: colors.surface, borderRadius: radius.lg, padding: spacing.md, marginBottom: spacing.lg },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.xs },
  linkText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  sectionMeta: { ...typography.caption, color: colors.textSecondary, marginBottom: spacing.xs },
  inlineRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  inlineLabel: { ...typography.body, color: colors.text },
  inlineValue: { ...typography.body, color: colors.primary, fontWeight: '600' },
  planName: { ...typography.h3, color: colors.text, marginBottom: spacing.xs },
  alertBadge: { backgroundColor: colors.primary + '15', borderRadius: radius.full, paddingHorizontal: spacing.sm, paddingVertical: 4 },
  alertBadgeText: { ...typography.caption, color: colors.primary, fontWeight: '600' },
  notificationRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm, paddingVertical: spacing.sm, borderTopWidth: 1, borderTopColor: colors.border },
  notificationRowUnread: { backgroundColor: colors.primary + '08' },
  notificationTitle: { ...typography.body, color: colors.text, fontWeight: '600' },
  notificationMeta: { ...typography.caption, color: colors.textSecondary, marginTop: 2 },
  notificationDot: { width: 8, height: 8, borderRadius: radius.full, backgroundColor: colors.warning },
  emptyAlertText: { ...typography.caption, color: colors.textTertiary, paddingTop: spacing.sm },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  alertDetailCard: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl },
  alertDetailHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: spacing.md, marginBottom: spacing.md },
  alertDetailTitle: { ...typography.h3, color: colors.text, marginBottom: 2 },
  alertDetailMeta: { ...typography.caption, color: colors.textSecondary },
  alertSummaryBox: { backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, marginBottom: spacing.md },
  alertSummaryLabel: { ...typography.caption, color: colors.primary, fontWeight: '700', marginBottom: 4 },
  alertSummaryText: { ...typography.body, color: colors.textSecondary },
  alertMetaRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.lg },
  alertMetaLabel: { ...typography.caption, color: colors.textSecondary },
  alertMetaValue: { ...typography.caption, color: colors.text, fontWeight: '600' },
  modalContent: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl },
  modalContentLarge: { backgroundColor: colors.background, borderTopLeftRadius: radius.lg, borderTopRightRadius: radius.lg, padding: spacing.xl, maxHeight: '90%' },
  settingsSwitchRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.md, paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: colors.border },
  modalTitle: { ...typography.h3, color: colors.text, marginBottom: spacing.md },
  input: { backgroundColor: colors.surface, borderRadius: radius.md, borderWidth: 1, borderColor: colors.border, padding: spacing.md, color: colors.text, marginBottom: spacing.md },
  textArea: { minHeight: 70, textAlignVertical: 'top' },
  textAreaLarge: { minHeight: 140, textAlignVertical: 'top' },
  inputLabel: { ...typography.caption, color: colors.text, marginBottom: spacing.sm },
  modalButtons: { flexDirection: 'row', gap: spacing.md },
  modalBtnSecondary: { flex: 1, backgroundColor: colors.surface, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  modalBtnSecondaryText: { ...typography.body, color: colors.textSecondary, fontWeight: '600' },
  modalBtnPrimary: { flex: 1, backgroundColor: colors.primary, borderRadius: radius.md, padding: spacing.md, alignItems: 'center' },
  modalBtnPrimaryText: { ...typography.body, color: colors.background, fontWeight: '600' },
  settingsRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  settingsLabel: { ...typography.body, color: colors.text },
  settingsValue: { ...typography.body, color: colors.primary, fontWeight: '600' },
  centerContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { ...typography.body, color: colors.textSecondary, marginTop: spacing.md },
  notificationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    gap: spacing.sm,
    borderLeftWidth: 4,
  },
  notificationBannerText: { ...typography.caption, color: colors.textSecondary },
});