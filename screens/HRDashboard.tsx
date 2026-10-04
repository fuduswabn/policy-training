import React, { useContext } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function HRDashboard({ navigation }: { navigation: any }) {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider missing');
  const { user } = auth;

  const stats = useQuery(
    api.hr.getHRDashboardStats,
    user?.companyId
      ? {
          companyId: user.companyId as any,
          userId: user.userId as any,
        }
      : 'skip'
  );

  if (!stats) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={[typography.h1, { color: colors.text, marginBottom: spacing.sm }]}>
            HR Dashboard
          </Text>
          <Text style={[typography.body, { color: colors.textSecondary }]}>
            Organisation Overview
          </Text>
        </View>

        {/* Key Metrics Grid */}
        <View style={styles.metricsGrid}>
          {/* Total Employees */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('EmployeeList')}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: `${colors.primary}20` }]}>
              <MaterialIcons name="people" size={24} color={colors.primary} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
              {stats.totalEmployees}
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Total Employees</Text>
          </TouchableOpacity>

          {/* Active Employees */}
          <View style={[styles.metricCard, { backgroundColor: `${colors.success}10` }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: `${colors.success}20` }]}>
              <MaterialIcons name="check-circle" size={24} color={colors.success} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
              {stats.activeEmployees}
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Active</Text>
          </View>

          {/* Departments */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('DepartmentList')}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: `${colors.warning}20` }]}>
              <MaterialIcons name="business" size={24} color={colors.warning} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
              {stats.departmentCount}
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Departments</Text>
          </TouchableOpacity>

          {/* Sites */}
          <TouchableOpacity
            style={styles.metricCard}
            onPress={() => navigation.navigate('SiteList')}
          >
            <View style={[styles.metricIconContainer, { backgroundColor: `${colors.secondary}20` }]}>
              <MaterialIcons name="location-on" size={24} color={colors.secondary} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
              {stats.siteCount}
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>Sites</Text>
          </TouchableOpacity>

          {/* On Leave */}
          <View style={[styles.metricCard, { backgroundColor: `${colors.warning}10` }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: `${colors.warning}20` }]}>
              <MaterialIcons name="event" size={24} color={colors.warning} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
              {stats.onLeaveCount}
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>On Leave</Text>
          </View>

          {/* New Hires */}
          <View style={[styles.metricCard, { backgroundColor: `${colors.success}10` }]}>
            <View style={[styles.metricIconContainer, { backgroundColor: `${colors.success}20` }]}>
              <MaterialIcons name="person-add" size={24} color={colors.success} />
            </View>
            <Text style={[typography.h3, { color: colors.text, marginTop: spacing.sm }]}>
              {stats.newHiresThisMonth}
            </Text>
            <Text style={[typography.small, { color: colors.textSecondary }]}>This Month</Text>
          </View>
        </View>

        {/* Department Breakdown */}
        {stats.departmentBreakdown.length > 0 && (
          <View style={styles.section}>
            <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
              Department Breakdown
            </Text>
            {stats.departmentBreakdown.map((dept, index) => (
              <View key={index} style={styles.departmentRow}>
                <Text style={[typography.body, { color: colors.text }]}>
                  {dept.departmentName}
                </Text>
                <View style={styles.progressBar}>
                  <View
                    style={[
                      styles.progressFill,
                      {
                        width: `${(dept.employeeCount / (stats.totalEmployees || 1)) * 100}%`,
                        backgroundColor: colors.primary,
                      },
                    ]}
                  />
                </View>
                <Text style={[typography.small, { color: colors.textSecondary, minWidth: 30 }]}>
                  {dept.employeeCount}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Quick Actions */}
        <View style={styles.section}>
          <Text style={[typography.h2, { color: colors.text, marginBottom: spacing.md }]}>
            Quick Actions
          </Text>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('AddEmployee')}
          >
            <MaterialIcons name="person-add" size={20} color={colors.primary} />
            <Text style={[typography.body, { color: colors.primary, marginLeft: spacing.md }]}>
              Add Employee
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('DepartmentList')}
          >
            <MaterialIcons name="business" size={20} color={colors.primary} />
            <Text style={[typography.body, { color: colors.primary, marginLeft: spacing.md }]}>
              Manage Departments
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('SiteList')}
          >
            <MaterialIcons name="location-on" size={20} color={colors.primary} />
            <Text style={[typography.body, { color: colors.primary, marginLeft: spacing.md }]}>
              Manage Sites
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate('EmployeeList')}
          >
            <MaterialIcons name="people" size={20} color={colors.primary} />
            <Text style={[typography.body, { color: colors.primary, marginLeft: spacing.md }]}>
              View Employees
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
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
    padding: spacing.lg,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  metricCard: {
    width: '48%',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricIconContainer: {
    width: 50,
    height: 50,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  departmentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.sm,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
  },
});
