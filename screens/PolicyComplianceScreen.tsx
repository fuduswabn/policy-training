import React, { useContext } from 'react';
import { StyleSheet, View, ScrollView, Text, FlatList, TouchableOpacity, SafeAreaView, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function PolicyComplianceScreen() {
  const auth = useContext(AuthContext);
  
  if (!auth?.user?.companyId) return null;

  const stats = useQuery(api.policies.getCompanyAcknowledgmentStats, {
    companyId: auth.user.companyId as any,
    userId: auth.user.userId as any,
  });

  if (!stats) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const complianceColor = stats.complianceRate >= 80 ? colors.success : stats.complianceRate >= 50 ? colors.warning : colors.error;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={typography.h2}>Policy Compliance</Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }}>
            Track policy acknowledgement across your organisation
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <View style={styles.statItem}>
            <Text style={{ ...typography.h3, color: complianceColor }}>
              {stats.complianceRate}%
            </Text>
            <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.xs }}>
              Compliance Rate
            </Text>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.statsGrid}>
            <View style={styles.gridItem}>
              <Text style={{ ...typography.h4, color: colors.text }}>{stats.acknowledgedCount}</Text>
              <Text style={{ ...typography.small, color: colors.textSecondary }}>Acknowledged</Text>
            </View>
            <View style={styles.gridItem}>
              <Text style={{ ...typography.h4, color: colors.warning }}>{stats.pendingCount}</Text>
              <Text style={{ ...typography.small, color: colors.textSecondary }}>Pending</Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={typography.h4}>Overview</Text>
          <View style={styles.infoCard}>
            <View style={styles.infoRow}>
              <Text style={typography.body}>Total Policies</Text>
              <Text style={{ ...typography.body, fontWeight: '600' }}>{stats.totalPolicies}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={typography.body}>Total Employees</Text>
              <Text style={{ ...typography.body, fontWeight: '600' }}>{stats.totalEmployees}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={typography.body}>Acknowledgements Required</Text>
              <Text style={{ ...typography.body, fontWeight: '600' }}>
                {stats.acknowledgedCount + stats.pendingCount}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={typography.h4}>Next Steps</Text>
          <View style={styles.actionCard}>
            <MaterialIcons name="info" size={24} color={colors.primary} />
            <Text style={{ ...typography.body, marginLeft: spacing.md, flex: 1 }}>
              Policy compliance tracking is automatic. Employees acknowledge policies in their training dashboard.
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    marginBottom: spacing.xl,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.xl,
  },
  statItem: {
    alignItems: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.lg,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  gridItem: {
    alignItems: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  infoCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  actionCard: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'flex-start',
  },
});
