import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, FlatList, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function PolicyManagementScreen() {
  const auth = useContext(AuthContext);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  
  if (!auth?.user?.companyId) return null;

  const policies = useQuery(api.policies.listCompanyPolicies, {
    companyId: auth.user.companyId as any,
    userId: auth.user.userId as any,
  }) || [];

  const assignments = selectedPolicyId 
    ? useQuery(api.policyManagement?.getPolicyAssignments || null, 
        selectedPolicyId ? {
          policyId: selectedPolicyId as any,
          companyId: auth.user.companyId as any,
        } : "skip")
    : [];

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={typography.h2}>Policy Management</Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }}>
            Upload, manage, and assign company policies for automatic AI-powered training
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={typography.h4}>Active Policies ({policies.length})</Text>
          
          {policies.length === 0 ? (
            <View style={styles.emptyState}>
              <MaterialIcons name="policy" size={48} color={colors.textTertiary} />
              <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>
                No policies yet
              </Text>
              <Text style={{ ...typography.small, color: colors.textTertiary, marginTop: spacing.sm }}>
                Upload your first policy to get started
              </Text>
            </View>
          ) : (
            <FlatList
              data={policies}
              scrollEnabled={false}
              renderItem={({ item }: any) => (
                <TouchableOpacity 
                  style={styles.policyCard}
                  onPress={() => setSelectedPolicyId(item._id)}
                >
                  <View style={styles.policyHeader}>
                    <Text style={typography.h4}>{item.title}</Text>
                    <View style={styles.versionBadge}>
                      <Text style={{ ...typography.small, color: colors.background }}>
                        v{item.version}
                      </Text>
                    </View>
                  </View>
                  {item.description && (
                    <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.sm }}>
                      {item.description}
                    </Text>
                  )}
                  <View style={styles.policyMeta}>
                    <View style={styles.metaItem}>
                      <MaterialIcons name={item.policyType === 'general' ? 'public' : 'group'} size={14} color={colors.textTertiary} />
                      <Text style={{ ...typography.small, color: colors.textSecondary, marginLeft: spacing.xs }}>
                        {item.policyType === 'general' ? 'General' : 'Group'}
                      </Text>
                    </View>
                    <View style={styles.metaItem}>
                      <MaterialIcons name="calendar-today" size={14} color={colors.textTertiary} />
                      <Text style={{ ...typography.small, color: colors.textSecondary, marginLeft: spacing.xs }}>
                        {new Date(item.createdAt).toLocaleDateString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item._id}
            />
          )}
        </View>

        {selectedPolicyId && (
          <View style={styles.section}>
            <Text style={typography.h4}>Assignments</Text>
            <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.sm }}>
              This policy is assigned to {(assignments || []).length} target group(s)
            </Text>
          </View>
        )}

        <View style={styles.section}>
          <Text style={typography.h4}>AI Status</Text>
          <View style={styles.aiStatus}>
            <MaterialIcons name="smart-toy" size={24} color={colors.success} />
            <View style={{ marginLeft: spacing.md, flex: 1 }}>
              <Text style={typography.body}>AI Training System Active</Text>
              <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.xs }}>
                Your policies are being analyzed for daily training questions
              </Text>
            </View>
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
  header: {
    marginBottom: spacing.xl,
  },
  section: {
    marginBottom: spacing.xl,
  },
  policyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  versionBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  policyMeta: {
    flexDirection: 'row',
    marginTop: spacing.md,
    gap: spacing.lg,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  aiStatus: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
});
