import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert, Modal } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function HRComplianceDashboard({ navigation }: any) {
  const { user } = useContext(AuthContext) as any;
  const dashboardData = useQuery(api.hrCompliance.getHRDashboardFull, {
    companyId: user?.companyId,
  });

  const [selectedTab, setSelectedTab] = useState<'overview' | 'insights' | 'employees' | 'departments'>('overview');
  const [selectedEmployee, setSelectedEmployee] = useState<any>(null);
  const [selectedGap, setSelectedGap] = useState<any>(null);
  const [departmentFilter, setDepartmentFilter] = useState<string>('');

  if (!dashboardData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const { complianceSummary, trainingInsights, trainingGaps, employeesAtRisk, departmentMetrics, recentFailures } = dashboardData;

  const realResults = complianceSummary?.complianceSummary ?? null;
  const acknowledgedPolicies = realResults?.acknowledgedPolicies ?? 0;
  const totalPolicies = realResults?.totalPolicies ?? 0;
  const quizCompleted = realResults?.quizCompleted ?? 0;
  const quizPassed = realResults?.quizPassed ?? 0;
  const averageScore = realResults?.averageScore ?? 0;

  const handleViewReport = (employee: any) => {
    navigation.push('EmployeeComplianceDetail', { employeeId: employee.id });
    setSelectedEmployee(null);
  };

  const handleAssignTraining = (employee: any) => {
    // Navigate to training assignment screen (to be created)
    // For now, show an alert
    Alert.alert('Assign Training', `Assign additional training to ${employee.name}`);
  };

  const handleViewGapDetails = (gap: any) => {
    setSelectedGap(gap);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Tab Navigation */}
      <View style={styles.tabBar}>
        <TabButton title="Overview" icon="dashboard" selected={selectedTab === 'overview'} onPress={() => setSelectedTab('overview')} />
        <TabButton title="Insights" icon="lightbulb" selected={selectedTab === 'insights'} onPress={() => setSelectedTab('insights')} />
        <TabButton title="Employees" icon="people" selected={selectedTab === 'employees'} onPress={() => setSelectedTab('employees')} />
        <TabButton title="Departments" icon="domain" selected={selectedTab === 'departments'} onPress={() => setSelectedTab('departments')} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        {/* OVERVIEW TAB */}
        {selectedTab === 'overview' && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Compliance Dashboard</Text>
              <Text style={styles.subtitle}>Real-time compliance metrics</Text>
            </View>

            {/* Overall Compliance Score Card */}
            <View style={styles.scoreCard}>
              <View style={styles.scoreContent}>
                <Text style={styles.scoreLabel}>Overall Compliance</Text>
                <Text style={styles.scoreValue}>{complianceSummary.overallCompliance.toFixed(1)}%</Text>
              </View>
              <View style={[styles.scoreIndicator, {
                backgroundColor: complianceSummary.overallCompliance >= 80 ? colors.success :
                  complianceSummary.overallCompliance >= 60 ? colors.warning : colors.error
              }]} />
            </View>

            <View style={styles.breakdownCard}>
              <Text style={styles.breakdownTitle}>Real Results Breakdown</Text>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Policies acknowledged</Text>
                <Text style={styles.breakdownValue}>{acknowledgedPolicies}/{totalPolicies}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Quizzes completed</Text>
                <Text style={styles.breakdownValue}>{quizCompleted}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Quizzes passed</Text>
                <Text style={styles.breakdownValue}>{quizPassed}</Text>
              </View>
              <View style={styles.breakdownRow}>
                <Text style={styles.breakdownLabel}>Average score</Text>
                <Text style={styles.breakdownValue}>{averageScore}%</Text>
              </View>
            </View>

            {/* Key Metrics Grid */}
            <Text style={styles.sectionTitle}>Key Metrics</Text>
            <View style={styles.metricsGrid}>
              <MetricCard
                label="Policy Acknowledgement"
                value={`${complianceSummary.policyAckRate.toFixed(1)}%`}
                icon="assignment"
                color={complianceSummary.policyAckRate >= 80 ? colors.success : colors.warning}
              />
              <MetricCard
                label="Test Completion"
                value={`${complianceSummary.testCompletionRate.toFixed(1)}%`}
                icon="quiz"
                color={complianceSummary.testCompletionRate >= 80 ? colors.success : colors.warning}
              />
              <MetricCard
                label="Pass Rate"
                value={`${complianceSummary.testPassRate.toFixed(1)}%`}
                icon="check-circle"
                color={complianceSummary.testPassRate >= 70 ? colors.success : colors.error}
              />
              <MetricCard
                label="Average Score"
                value={`${complianceSummary.averageScore.toFixed(1)}%`}
                icon="trending-up"
                color={complianceSummary.averageScore >= 70 ? colors.success : colors.warning}
              />
            </View>

            {/* At-Risk Areas */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>At-Risk Areas</Text>
              {complianceSummary.failedTests > 0 && (
                <RiskItem
                  icon="warning"
                  count={complianceSummary.failedTests}
                  label="Failed Tests (30 days)"
                  color={colors.error}
                  onPress={() => setSelectedTab('employees')}
                />
              )}
              {complianceSummary.overdueTests > 0 && (
                <RiskItem
                  icon="schedule"
                  count={complianceSummary.overdueTests}
                  label="Overdue Tests"
                  color={colors.warning}
                  onPress={() => setSelectedTab('employees')}
                />
              )}
              {complianceSummary.employeesRequiringAttention > 0 && (
                <RiskItem
                  icon="people"
                  count={complianceSummary.employeesRequiringAttention}
                  label="Employees Needing Attention"
                  color={colors.error}
                  onPress={() => setSelectedTab('employees')}
                />
              )}
            </View>

            {/* Recent Failures */}
            {recentFailures.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Recent Test Failures</Text>
                {recentFailures.map((failure: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.failureItem}
                    onPress={() => {
                      const emp = employeesAtRisk.find((e: any) => e.name === failure.employeeName);
                      if (emp) setSelectedEmployee(emp);
                    }}
                  >
                    <View>
                      <Text style={styles.failureName}>{failure.employeeName}</Text>
                      <Text style={styles.failureDate}>{failure.date}</Text>
                    </View>
                    <View style={styles.failureScore}>
                      <Text style={[styles.failureScoreText, { color: colors.error }]}>
                        {failure.score}/{failure.totalQuestions}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* TRAINING INSIGHTS TAB */}
        {selectedTab === 'insights' && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>AI Training Insights</Text>
              <Text style={styles.subtitle}>Automatically detected training gaps</Text>
            </View>

            {trainingInsights.length > 0 ? (
              <View style={styles.section}>
                {trainingInsights.map((insight: string, idx: number) => (
                  <View key={idx} style={styles.insightItem}>
                    <MaterialIcons name="lightbulb-outline" size={24} color={colors.primary} />
                    <Text style={styles.insightText}>{insight}</Text>
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.noData}>No critical insights at this time</Text>
              </View>
            )}

            {trainingGaps.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Struggling Areas</Text>
                {trainingGaps.slice(0, 5).map((gap: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.gapItem}
                    onPress={() => handleViewGapDetails(gap)}
                  >
                    <View style={styles.gapContent}>
                      <Text style={styles.gapTopic}>{gap.topic}</Text>
                      <Text style={styles.gapSubtext}>{gap.affectedEmployees} employees affected · {gap.failureCount} failures</Text>
                    </View>
                    <View style={styles.gapBadge}>
                      <Text style={styles.gapBadgeText}>{gap.failureCount}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </>
        )}

        {/* EMPLOYEES TAB */}
        {selectedTab === 'employees' && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Employee Compliance</Text>
              <Text style={styles.subtitle}>{employeesAtRisk.length} employees requiring attention</Text>
            </View>

            {employeesAtRisk.length > 0 ? (
              <View style={styles.section}>
                {employeesAtRisk.map((emp: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.employeeCard} 
                    onPress={() => setSelectedEmployee(emp)}
                  >
                    <View style={styles.employeeHeader}>
                      <View>
                        <Text style={styles.employeeName}>{emp.name}</Text>
                        <Text style={styles.employeeEmail}>{emp.email}</Text>
                      </View>
                      <View style={[styles.statusBadge, {
                        backgroundColor: emp.status === 'Critical' ? colors.error : emp.status === 'At Risk' ? colors.warning : colors.success
                      }]}>
                        <Text style={styles.statusText}>{emp.status}</Text>
                      </View>
                    </View>
                    <View style={styles.employeeMetrics}>
                      <MetricBadge label="Failures" value={emp.failures} />
                      <MetricBadge label="Last Score" value={`${emp.lastAttemptScore}%`} />
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={styles.section}>
                <Text style={styles.noData}>All employees are compliant</Text>
              </View>
            )}
          </>
        )}

        {/* DEPARTMENTS TAB */}
        {selectedTab === 'departments' && (
          <>
            <View style={styles.header}>
              <Text style={styles.title}>Department Compliance</Text>
              <Text style={styles.subtitle}>Performance by department</Text>
            </View>

            <View style={styles.section}>
              {departmentMetrics.length > 0 ? (
                departmentMetrics.map((dept: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx} 
                    style={styles.departmentCard}
                    onPress={() => navigation.push('DepartmentComplianceDetail', { departmentId: dept.id, departmentName: dept.departmentName })}
                  >
                    <View style={styles.deptHeader}>
                      <View>
                        <Text style={styles.deptName}>{dept.departmentName}</Text>
                        <Text style={styles.deptSubtext}>{dept.employeeCount} employees · {dept.testCount} tests</Text>
                      </View>
                      <View style={[styles.deptStatusBadge, {
                        backgroundColor: dept.status === 'Good' ? colors.success : dept.status === 'Warning' ? colors.warning : colors.error
                      }]}>
                        <Text style={styles.statusText}>{dept.status}</Text>
                      </View>
                    </View>
                    <View style={styles.deptMetrics}>
                      <ProgressBar label="Pass Rate" value={dept.passRate} max={100} />
                      <View style={styles.deptAvgScore}>
                        <Text style={styles.deptAvgLabel}>Average Score</Text>
                        <Text style={styles.deptAvgValue}>{dept.avgScore}%</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              ) : (
                <Text style={styles.noData}>No department data available</Text>
              )}
            </View>
          </>
        )}

        <View style={{ height: spacing.xl }} />
      </ScrollView>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <Modal visible={!!selectedEmployee} animationType="slide" transparent={true}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedEmployee(null)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Employee Details</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailName}>{selectedEmployee.name}</Text>
                <Text style={styles.detailEmail}>{selectedEmployee.email}</Text>
                <View style={[styles.largeStatusBadge, {
                  backgroundColor: selectedEmployee.status === 'Critical' ? colors.error :
                    selectedEmployee.status === 'At Risk' ? colors.warning : colors.success
                }]}>
                  <Text style={styles.largeStatusText}>{selectedEmployee.status}</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Performance Summary</Text>
                <DetailMetric label="Failed Tests" value={selectedEmployee.failures} />
                <DetailMetric label="Last Attempt Score" value={`${selectedEmployee.lastAttemptScore}%`} />
              </View>

              <TouchableOpacity 
                style={styles.actionButton}
                onPress={() => handleViewReport(selectedEmployee)}
              >
                <MaterialIcons name="assignment" size={20} color={colors.primary} />
                <Text style={styles.actionButtonText}>View Full Compliance Report</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.actionButton, { borderColor: colors.warning }]}
                onPress={() => handleAssignTraining(selectedEmployee)}
              >
                <MaterialIcons name="school" size={20} color={colors.warning} />
                <Text style={[styles.actionButtonText, { color: colors.warning }]}>Assign Additional Training</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Training Gap Detail Modal */}
      {selectedGap && (
        <Modal visible={!!selectedGap} animationType="slide" transparent={true}>
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={() => setSelectedGap(null)}>
                <MaterialIcons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Training Gap</Text>
              <View style={{ width: 24 }} />
            </View>

            <ScrollView style={styles.modalContent}>
              <View style={styles.detailSection}>
                <Text style={styles.detailName}>{selectedGap.topic}</Text>
                <View style={styles.gapStatsBadge}>
                  <Text style={styles.gapStatText}>{selectedGap.affectedEmployees} employees affected</Text>
                </View>
                <View style={[styles.largeStatusBadge, { backgroundColor: colors.error, marginTop: spacing.md }]}>
                  <Text style={styles.largeStatusText}>{selectedGap.failureCount} failures</Text>
                </View>
              </View>

              <View style={styles.detailSection}>
                <Text style={styles.detailSectionTitle}>Affected Employees</Text>
                {selectedGap.employees && selectedGap.employees.map((emp: any, idx: number) => (
                  <TouchableOpacity 
                    key={idx}
                    style={styles.affectedEmployeeItem}
                    onPress={() => {
                      setSelectedGap(null);
                      const empData = employeesAtRisk.find((e: any) => e.id === emp.id);
                      if (empData) setSelectedEmployee(empData);
                    }}
                  >
                    <View style={styles.affectedEmpInfo}>
                      <Text style={styles.affectedEmpName}>{emp.name}</Text>
                      <Text style={styles.affectedEmpEmail}>{emp.email}</Text>
                    </View>
                    <View style={[styles.affectedEmpScore, { backgroundColor: emp.failureScore < 70 ? colors.error + '20' : colors.warning + '20' }]}>
                      <Text style={{ color: emp.failureScore < 70 ? colors.error : colors.warning, fontWeight: 'bold' }}>
                        {emp.failureScore}%
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="assignment" size={20} color={colors.primary} />
                <Text style={styles.actionButtonText}>Assign Training on {selectedGap.topic}</Text>
              </TouchableOpacity>
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}
    </SafeAreaView>
  );
}

function TabButton({ title, icon, selected, onPress }: any) {
  return (
    <TouchableOpacity
      style={[styles.tabButton, selected && styles.tabButtonActive]}
      onPress={onPress}
    >
      <MaterialIcons
        name={icon}
        size={20}
        color={selected ? colors.primary : colors.textSecondary}
      />
      <Text
        style={[
          styles.tabButtonText,
          selected && styles.tabButtonTextActive,
        ]}
      >
        {title}
      </Text>
    </TouchableOpacity>
  );
}

function MetricCard({ label, value, icon, color }: any) {
  return (
    <View style={styles.metricCard}>
      <MaterialIcons name={icon} size={24} color={color || colors.primary} />
      <Text style={styles.metricValue}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

function MetricBadge({ label, value }: any) {
  return (
    <View style={styles.metricBadge}>
      <Text style={styles.metricBadgeLabel}>{label}</Text>
      <Text style={styles.metricBadgeValue}>{value}</Text>
    </View>
  );
}

function RiskItem({ icon, count, label, color, onPress }: any) {
  return (
    <TouchableOpacity style={styles.riskItem} onPress={onPress}>
      <View style={styles.riskLeft}>
        <MaterialIcons name={icon} size={24} color={color} />
        <View style={styles.riskContent}>
          <Text style={styles.riskCount}>{count}</Text>
          <Text style={styles.riskLabel}>{label}</Text>
        </View>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
    </TouchableOpacity>
  );
}

function ProgressBar({ label, value, max }: any) {
  const percentage = (value / max) * 100;
  return (
    <View style={styles.progressContainer}>
      <Text style={styles.progressLabel}>{label}: {value.toFixed(1)}%</Text>
      <View style={styles.progressBarBg}>
        <View style={[styles.progressBarFill, { width: `${percentage}%`, backgroundColor: percentage >= 80 ? colors.success : percentage >= 60 ? colors.warning : colors.error }]} />
      </View>
    </View>
  );
}

function DetailMetric({ label, value }: any) {
  return (
    <View style={styles.detailMetric}>
      <Text style={styles.detailMetricLabel}>{label}</Text>
      <Text style={styles.detailMetricValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.background,
  },
  tabButton: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  tabButtonActive: {
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
  },
  tabButtonText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabButtonTextActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  title: {
    ...typography.h1,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  scoreCard: {
    flexDirection: 'row',
    margin: spacing.lg,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scoreContent: {
    flex: 1,
  },
  scoreLabel: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  scoreValue: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text,
  },
  scoreIndicator: {
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  breakdownCard: {
    marginHorizontal: spacing.lg,
    marginTop: -spacing.sm,
    marginBottom: spacing.lg,
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  breakdownTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  breakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.xs,
  },
  breakdownLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  breakdownValue: {
    ...typography.caption,
    color: colors.text,
    fontWeight: '700',
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  metricValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.sm,
  },
  metricLabel: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  riskItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  riskLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  riskContent: {
    marginLeft: spacing.md,
    flex: 1,
  },
  riskCount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  riskLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  failureItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  failureName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  failureDate: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  failureScore: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  failureScoreText: {
    fontWeight: 'bold',
    fontSize: 16,
  },
  insightItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    alignItems: 'flex-start',
  },
  insightText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  gapItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  gapContent: {
    flex: 1,
  },
  gapTopic: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  gapSubtext: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  gapBadge: {
    backgroundColor: colors.error + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  gapBadgeText: {
    color: colors.error,
    fontWeight: 'bold',
    fontSize: 14,
  },
  employeeCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  employeeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  employeeName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  employeeEmail: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  statusText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 12,
  },
  employeeMetrics: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  metricBadge: {
    flex: 1,
    backgroundColor: colors.surfaceDark,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  metricBadgeLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  metricBadgeValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.xs,
  },
  departmentCard: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
  deptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  deptName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  deptSubtext: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  deptStatusBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  deptMetrics: {
    gap: spacing.md,
  },
  progressContainer: {
    marginBottom: spacing.sm,
  },
  progressLabel: {
    ...typography.small,
    color: colors.text,
    marginBottom: spacing.xs,
    fontWeight: '500',
  },
  progressBarBg: {
    height: 8,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
  },
  deptAvgScore: {
    alignItems: 'center',
  },
  deptAvgLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  deptAvgValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text,
    marginTop: spacing.xs,
  },
  noData: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    padding: spacing.lg,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    ...typography.h2,
    color: colors.text,
  },
  modalContent: {
    flex: 1,
    padding: spacing.lg,
  },
  detailSection: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  detailName: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  detailEmail: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.md,
  },
  largeStatusBadge: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
  },
  largeStatusText: {
    color: colors.background,
    fontWeight: '600',
    fontSize: 16,
  },
  detailSectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  detailMetric: {
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailMetricLabel: {
    ...typography.body,
    color: colors.textSecondary,
  },
  detailMetricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text,
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  actionButtonText: {
    ...typography.body,
    color: colors.primary,
    marginLeft: spacing.md,
    fontWeight: '600',
    flex: 1,
  },
  gapStatsBadge: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  gapStatText: {
    ...typography.body,
    color: colors.text,
  },
  affectedEmployeeItem: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  affectedEmpInfo: {
    flex: 1,
  },
  affectedEmpName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  affectedEmpEmail: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  affectedEmpScore: {
    backgroundColor: colors.surface,
    padding: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
});

// ... existing code ...