import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, ActivityIndicator, FlatList } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function EmployeeComplianceDetailScreen({ route }: any) {
  const { user } = useContext(AuthContext) as any;
  const { employeeId } = route.params;

  const employeeData = useQuery(
    api.compliance.getEmployeeComplianceProfile,
    { companyId: user?.companyId, userId: employeeId }
  );

  if (!employeeData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const { employee, compliance } = employeeData;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'compliant':
        return colors.success;
      case 'at-risk':
        return colors.warning;
      case 'needs-attention':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Employee Header */}
        <View style={styles.header}>
          <View style={styles.avatarPlaceholder}>
            <MaterialIcons name="person" size={40} color={colors.white} />
          </View>
          <View style={styles.headerContent}>
            <Text style={styles.employeeName}>{employee.name}</Text>
            <Text style={styles.employeeEmail}>{employee.email}</Text>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(compliance.trainingStatus) }]}>
              <Text style={styles.statusText}>{compliance.trainingStatus.toUpperCase()}</Text>
            </View>
          </View>
        </View>

        {/* Compliance Summary */}
        <Text style={styles.sectionTitle}>Compliance Summary</Text>
        <View style={styles.summaryGrid}>
          <SummaryItem label="Avg Score" value={`${compliance.averageScore}%`} />
          <SummaryItem label="Pass Rate" value={`${compliance.passRate}%`} />
          <SummaryItem label="Tests Completed" value={compliance.dailyTestsCompleted} />
          <SummaryItem label="Tests Missed" value={compliance.dailyTestsMissed} />
        </View>

        {/* Policy Acknowledgements */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Policy Acknowledgements</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <MaterialIcons name="check-circle" size={24} color={colors.success} />
              <Text style={styles.infoText}>{compliance.policiesAcknowledged} acknowledged</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="pending" size={24} color={colors.warning} />
              <Text style={styles.infoText}>{compliance.policiesOutstanding} outstanding</Text>
            </View>
          </View>
        </View>

        {/* Recent Performance */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Performance (7 days)</Text>
          <View style={styles.performanceCard}>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Tests Completed:</Text>
              <Text style={styles.performanceValue}>{compliance.recentPerformance.recentTestsCompleted}</Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Pass Rate:</Text>
              <Text style={styles.performanceValue}>{compliance.recentPerformance.recentPassRate}%</Text>
            </View>
            <View style={styles.performanceRow}>
              <Text style={styles.performanceLabel}>Trend:</Text>
              <View style={styles.trendBadge}>
                <MaterialIcons 
                  name={
                    compliance.recentPerformance.trend === 'improving' ? 'trending-up' :
                    compliance.recentPerformance.trend === 'declining' ? 'trending-down' :
                    'trending-flat'
                  }
                  size={20}
                  color={
                    compliance.recentPerformance.trend === 'improving' ? colors.success :
                    compliance.recentPerformance.trend === 'declining' ? colors.error :
                    colors.warning
                  }
                />
                <Text style={styles.trendText}>{compliance.recentPerformance.trend}</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Weak Topics */}
        {compliance.weakTopics.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Topics Needing Improvement</Text>
            <FlatList
              scrollEnabled={false}
              data={compliance.weakTopics}
              keyExtractor={(item) => item.topic}
              renderItem={({ item }) => (
                <View style={styles.topicItem}>
                  <View style={styles.topicHeader}>
                    <Text style={styles.topicName}>{item.topic}</Text>
                    <Text style={styles.topicScore}>{item.averageScore}%</Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View 
                      style={[
                        styles.progressFill,
                        { width: `${item.averageScore}%`, backgroundColor: item.averageScore < 70 ? colors.error : colors.warning }
                      ]}
                    />
                  </View>
                  <Text style={styles.topicAttempts}>{item.attempts} attempts</Text>
                </View>
              )}
            />
          </View>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryItem({ label, value }: any) {
  return (
    <View style={styles.summaryItem}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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
    padding: spacing.lg,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatarPlaceholder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  headerContent: {
    flex: 1,
  },
  employeeName: {
    ...typography.h3,
    color: colors.text,
  },
  employeeEmail: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    marginTop: spacing.sm,
  },
  statusText: {
    ...typography.small,
    color: colors.white,
    fontWeight: '600',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginLeft: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  summaryItem: {
    width: '48%',
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginRight: '4%',
    marginBottom: spacing.md,
  },
  summaryLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  summaryValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.xs,
  },
  infoCard: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  infoText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
  },
  performanceCard: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  performanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  performanceLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  performanceValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  trendBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
  },
  trendText: {
    ...typography.small,
    color: colors.text,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
  },
  topicItem: {
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.md,
  },
  topicHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  topicName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  topicScore: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.error,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    marginBottom: spacing.xs,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
  },
  topicAttempts: {
    ...typography.small,
    color: colors.textSecondary,
  },
});