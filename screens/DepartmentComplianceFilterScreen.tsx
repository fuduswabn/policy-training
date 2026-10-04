import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, ActivityIndicator, FlatList, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function DepartmentComplianceFilterScreen({ navigation }: any) {
  const { user } = useContext(AuthContext) as any;
  const [selectedDepartment, setSelectedDepartment] = useState<string | null>(null);

  const departments = useQuery(api.hr.getDepartments, {
    companyId: user?.companyId,
  });

  const departmentCompliance = useQuery(
    api.compliance.getDepartmentCompliance,
    {
      companyId: user?.companyId,
      departmentId: selectedDepartment as any,
    }
  );

  if (!departments || !departmentCompliance) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const { metrics, employeesList } = departmentCompliance;

  const getStatusColor = (requiresAttention: boolean) => {
    return requiresAttention ? colors.error : colors.success;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Department Filter */}
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Select Department</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterScroll}>
            <TouchableOpacity
              style={[styles.filterChip, !selectedDepartment && styles.filterChipActive]}
              onPress={() => setSelectedDepartment(null)}
            >
              <Text style={[styles.filterChipText, !selectedDepartment && styles.filterChipTextActive]}>
                All
              </Text>
            </TouchableOpacity>
            {departments.map((dept) => (
              <TouchableOpacity
                key={dept._id}
                style={[styles.filterChip, selectedDepartment === dept._id && styles.filterChipActive]}
                onPress={() => setSelectedDepartment(dept._id)}
              >
                <Text style={[styles.filterChipText, selectedDepartment === dept._id && styles.filterChipTextActive]}>
                  {dept.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Department Metrics */}
        <View style={styles.metricsSection}>
          <Text style={styles.sectionTitle}>Department Metrics</Text>
          <View style={styles.metricsGrid}>
            <MetricBox label="Employees" value={metrics.totalEmployees} />
            <MetricBox label="Avg Compliance" value={`${metrics.averageCompliance}%`} />
            <MetricBox label="Avg Score" value={`${metrics.averageScore}%`} />
            <MetricBox label="Failure Rate" value={`${metrics.failureRate}%`} />
          </View>
          
          {metrics.requiresAttention && (
            <View style={styles.warningCard}>
              <MaterialIcons name="warning" size={24} color={colors.error} />
              <Text style={styles.warningText}>This department requires attention</Text>
            </View>
          )}
        </View>

        {/* Employee List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Employee Compliance</Text>
          <FlatList
            scrollEnabled={false}
            data={employeesList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <TouchableOpacity 
                style={styles.employeeItem}
                onPress={() => navigation.navigate('EmployeeComplianceDetail', { employeeId: item.id })}
              >
                <View style={styles.employeeInfo}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.requiresAttention) }]} />
                  <View style={styles.employeeDetails}>
                    <Text style={styles.employeeName}>{item.name}</Text>
                    <Text style={styles.employeeScore}>
                      {item.testCount} tests · {item.averageScore}% avg
                    </Text>
                  </View>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
              </TouchableOpacity>
            )}
          />
        </View>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function MetricBox({ label, value }: any) {
  return (
    <View style={styles.metricBox}>
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
  filterSection: {
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterLabel: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  filterScroll: {
    flexDirection: 'row',
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 20,
    backgroundColor: colors.surfaceLight,
    marginRight: spacing.sm,
  },
  filterChipActive: {
    backgroundColor: colors.primary,
  },
  filterChipText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  filterChipTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  metricsSection: {
    padding: spacing.lg,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: spacing.md,
  },
  metricBox: {
    width: '48%',
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginRight: '4%',
    marginBottom: spacing.md,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  metricLabel: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  warningCard: {
    backgroundColor: colors.errorLight,
    padding: spacing.md,
    borderRadius: radius.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  warningText: {
    ...typography.body,
    color: colors.error,
    marginLeft: spacing.md,
    flex: 1,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.md,
  },
  section: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  employeeItem: {
    flexDirection: 'row',
    backgroundColor: colors.surfaceLight,
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.sm,
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  employeeInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.md,
  },
  employeeDetails: {
    flex: 1,
  },
  employeeName: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  employeeScore: {
    ...typography.small,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
});
