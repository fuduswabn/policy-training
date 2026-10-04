import React, { useContext } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function DepartmentComplianceDetailScreen({ route, navigation }: any) {
  const { user } = useContext(AuthContext) as any;
  const { departmentName } = route.params;

  const departmentData = useQuery(api.hrCompliance.getDepartmentComplianceDetailed, {
    companyId: user?.companyId,
    departmentId: route.params.departmentId,
  });

  if (!departmentData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const { metrics, employees, trainingGaps } = departmentData;

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <View style={styles.headerTitle}>
            <Text style={styles.title}>{departmentName}</Text>
            <Text style={styles.subtitle}>Department Compliance</Text>
          </View>
        </View>

        {/* Metrics */}
        <View style={styles.metricsSection}>
          <View style={styles.metricRow}>
            <MetricBox label="Total Employees" value={metrics.employeeCount} icon="people" />
            <MetricBox label="Pass Rate" value={`${metrics.passRate.toFixed(1)}%`} icon="trending-up" />
          </View>
          <View style={styles.metricRow}>
            <MetricBox label="Avg Score" value={`${metrics.avgScore.toFixed(1)}%`} icon="assessment" />
            <MetricBox label="Tests Completed" value={metrics.testCount} icon="quiz" />
          </View>
        </View>

        {/* Status Badge */}
        <View style={styles.statusContainer}>
          <View style={[styles.statusBadge, {
            backgroundColor: metrics.status === 'Good' ? colors.success : 
                           metrics.status === 'Warning' ? colors.warning : colors.error
          }]}>
            <Text style={styles.statusText}>{metrics.status}</Text>
          </View>
        </View>

        {/* Training Gaps */}
        {trainingGaps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Training Gaps</Text>
            {trainingGaps.map((gap: any, idx: number) => (
              <View key={idx} style={styles.gapCard}>
                <View style={styles.gapHeader}>
                  <Text style={styles.gapTopic}>{gap.topic}</Text>
                  <View style={styles.gapBadge}>
                    <Text style={styles.gapBadgeText}>{gap.failureCount}</Text>
                  </View>
                </View>
                <Text style={styles.gapSubtext}>{gap.affectedEmployees} employees affected</Text>
              </View>
            ))}
          </View>
        )}

        {/* Employees */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Compliance</Text>
          {employees.map((emp: any, idx: number) => (
            <TouchableOpacity 
              key={idx}
              style={styles.employeeItem}
              onPress={() => navigation.push('EmployeeComplianceDetail', { employeeId: emp.id })}
            >
              <View style={styles.employeeInfo}>
                <Text style={styles.employeeName}>{emp.name}</Text>
                <Text style={styles.employeeMetrics}>{emp.testCount} tests · {emp.avgScore}% avg</Text>
              </View>
              <View style={[styles.statusIndicator, {
                backgroundColor: emp.status === 'compliant' ? colors.success :
                               emp.status === 'at-risk' ? colors.warning : colors.error
              }]} />
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricBox({ label, value, icon }: any) {
  return (
    <View style={styles.metricBox}>
      <MaterialIcons name={icon} size={24} color={colors.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
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
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerTitle: {
    marginLeft: spacing.lg,
    flex: 1,
  },
  title: {
    ...typography.h1,
    color: colors.text,
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  metricsSection: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  metricRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricBox: {
    flex: 1,
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  metricLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusContainer: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  statusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  statusText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 16,
  },
  section: {
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  gapCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  gapHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gapTopic: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    flex: 1,
  },
  gapBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  gapBadgeText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 14,
  },
  gapSubtext: {
    ...typography.small,
    color: colors.textSecondary,
  },
  employeeItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  employeeInfo: {
    flex: 1,
  },
  employeeName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  employeeMetrics: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginLeft: spacing.md,
  },
});
