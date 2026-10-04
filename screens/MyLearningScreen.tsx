import React, { useState, useContext } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

type LearningRequest = {
  _id: string;
  skill: string;
  status: 'active' | 'completed' | 'requested';
  goal?: string;
  availableLearningTime?: number;
  experienceLevel?: string;
};

const LEARNING_TABS: Array<'active' | 'completed' | 'requested'> = ['active', 'completed', 'requested'];

export default function MyLearningScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'requested'>('active');

  // Call useQuery unconditionally at top level - use 'skip' when no user
  const learningRequests = useQuery(
    api.personalLearning.getUserLearningRequests,
    user ? { userId: user.userId as any } : 'skip'
  );

  // Now check for user after hooks
  if (!user) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={[typography.h2, { color: colors.text, textAlign: 'center', marginTop: spacing.lg }]}>
          Please log in to access learning
        </Text>
      </SafeAreaView>
    );
  }

  if (learningRequests === undefined) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const activeLearning = (learningRequests?.filter((r: LearningRequest) => r.status === 'active') || []) as LearningRequest[];
  const completedLearning = (learningRequests?.filter((r: LearningRequest) => r.status === 'completed') || []) as LearningRequest[];
  const requestedLearning = (learningRequests?.filter((r: LearningRequest) => r.status === 'requested') || []) as LearningRequest[];

  const currentActiveLearning = activeLearning[0];
  const currentTab: LearningRequest[] = 
    activeTab === 'active' ? activeLearning :
    activeTab === 'completed' ? completedLearning :
    requestedLearning;

  const openLearningPlan = (requestId: string) => {
    navigation.navigate('LearningPlan', { learningRequestId: requestId });
  };

  const renderLearningItem = (item: LearningRequest) => (
    <TouchableOpacity 
      style={styles.learningCard}
      onPress={() => openLearningPlan(item._id)}
    >
      <View style={styles.cardHeader}>
        <Text style={[typography.h3, { color: colors.text }]}>{item.skill}</Text>
        <View style={[styles.statusBadge, { backgroundColor: 
          item.status === 'active' ? colors.success :
          item.status === 'completed' ? colors.primary :
          colors.warning
        }]}>
          <Text style={[typography.caption, { color: colors.background }]}>
            {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
          </Text>
        </View>
      </View>
      
      <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.sm }]}>
        {item.goal}
      </Text>

      <View style={styles.cardFooter}>
        <View style={styles.metaItem}>
          <MaterialIcons name="schedule" size={16} color={colors.primary} />
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
            {item.availableLearningTime} min/day
          </Text>
        </View>
        <View style={styles.metaItem}>
          <MaterialIcons name="bar_chart" size={16} color={colors.primary} />
          <Text style={[typography.small, { color: colors.textSecondary, marginLeft: spacing.xs }]}>
            {item.experienceLevel}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="school" size={64} color={colors.primary} style={{ marginBottom: spacing.md }} />
      <Text style={[typography.h3, { color: colors.text, textAlign: 'center' }]}>
        No {activeTab} learning yet
      </Text>
      <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center', marginTop: spacing.sm }]}>
        {activeTab === 'active' && 'Request a new skill to get started'}
        {activeTab === 'completed' && 'Your completed learning will appear here'}
        {activeTab === 'requested' && 'Your learning requests will appear here'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {currentActiveLearning && (
          <TouchableOpacity
            style={styles.activeLearningBanner}
            onPress={() => openLearningPlan(currentActiveLearning._id)}
          >
            <MaterialIcons name="school" size={26} color={colors.primary} />
            <View style={{ flex: 1 }}>
              <Text style={[typography.caption, { color: colors.primary, fontWeight: '700', marginBottom: 2 }]}>In progress</Text>
              <Text style={[typography.h3, { color: colors.text }]}>{currentActiveLearning.skill}</Text>
              <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.xs }]}>Tap to continue your active learning plan</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
          </TouchableOpacity>
        )}

        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.h2, { color: colors.text }]}>My Learning</Text>
          <TouchableOpacity 
            style={[styles.requestButton, { backgroundColor: colors.primary }]}
            onPress={() => navigation.navigate('RequestNewSkill')}
          >
            <MaterialIcons name="add" size={20} color={colors.background} />
            <Text style={[typography.body, { color: colors.background, marginLeft: spacing.sm }]}>
              Request Skill
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tabs */}
        <View style={styles.tabContainer}>
          {LEARNING_TABS.map((tab) => (
            <TouchableOpacity 
              key={tab}
              style={[
                styles.tab,
                activeTab === tab && { borderBottomColor: colors.primary, borderBottomWidth: 3 }
              ]}
              onPress={() => setActiveTab(tab as any)}
            >
              <Text style={[
                typography.body,
                { 
                  color: activeTab === tab ? colors.primary : colors.textSecondary,
                  fontWeight: activeTab === tab ? '600' : '400'
                }
              ]}>
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        <View style={styles.content}>
          {currentTab.length === 0 ? (
            renderEmptyState()
          ) : (
            <FlatList
              data={currentTab}
              keyExtractor={(item: LearningRequest) => item._id}
              renderItem={({ item }: { item: LearningRequest }) => renderLearningItem(item)}
              scrollEnabled={false}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  requestButton: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    alignItems: 'center',
  },
  tabContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.surface,
    paddingHorizontal: spacing.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    borderBottomWidth: 3,
    borderBottomColor: 'transparent',
  },
  content: {
    padding: spacing.lg,
  },
  activeLearningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    margin: spacing.lg,
    marginBottom: 0,
    padding: spacing.md,
    borderRadius: radius.lg,
    backgroundColor: colors.primary + '10',
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  learningCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.full,
  },
  cardFooter: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.md,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
});