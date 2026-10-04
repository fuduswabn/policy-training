import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, FlatList, SafeAreaView, Alert, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function PolicyAssignmentScreen() {
  const auth = useContext(AuthContext);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string | null>(null);
  
  if (!auth?.user?.companyId) return null;

  const policies = useQuery(api.policies.listCompanyPolicies, {
    companyId: auth.user.companyId as any,
    userId: auth.user.userId as any,
  }) || [];

  const departments = useQuery(api.hr?.getCompanyDepartments || null,
    auth.user.companyId ? { companyId: auth.user.companyId as any } : "skip"
  ) || [];

  const sites = useQuery(api.hr?.getCompanySites || null,
    auth.user.companyId ? { companyId: auth.user.companyId as any } : "skip"
  ) || [];

  const selectedPolicy = policies.find((p: any) => p._id === selectedPolicyId);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={typography.h2}>Policy Assignments</Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }}>
            Assign policies to departments, sites, and employees
          </Text>
        </View>

        <View style={styles.section}>
          <Text style={typography.h4}>Select Policy</Text>
          {policies.length === 0 ? (
            <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.md }}>
              No policies available
            </Text>
          ) : (
            <FlatList
              data={policies}
              scrollEnabled={false}
              renderItem={({ item }: any) => (
                <TouchableOpacity 
                  style={[
                    styles.policyItem,
                    selectedPolicyId === item._id && styles.policyItemSelected
                  ]}
                  onPress={() => setSelectedPolicyId(item._id)}
                >
                  <View style={styles.policyItemContent}>
                    <Text style={typography.body}>{item.title}</Text>
                    <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.xs }}>
                      v{item.version}
                    </Text>
                  </View>
                  {selectedPolicyId === item._id && (
                    <MaterialIcons name="check" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              keyExtractor={(item) => item._id}
            />
          )}
        </View>

        {selectedPolicy && (
          <>
            <View style={styles.section}>
              <Text style={typography.h4}>Assign to Departments</Text>
              <Text style={{ ...typography.small, color: colors.textSecondary, marginBottom: spacing.md }}>
                {departments.length} department(s) available
              </Text>
              {departments.length > 0 ? (
                <FlatList
                  data={departments}
                  scrollEnabled={false}
                  renderItem={({ item }: any) => (
                    <View style={styles.assignmentItem}>
                      <View>
                        <Text style={typography.body}>{item.name}</Text>
                        <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.xs }}>
                          {item.status === 'active' ? '✓ Active' : '○ Inactive'}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.assignButton}>
                        <MaterialIcons name="add" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                  keyExtractor={(item) => item._id}
                />
              ) : (
                <Text style={{ ...typography.small, color: colors.textTertiary }}>
                  Create departments first
                </Text>
              )}
            </View>

            <View style={styles.section}>
              <Text style={typography.h4}>Assign to Sites</Text>
              <Text style={{ ...typography.small, color: colors.textSecondary, marginBottom: spacing.md }}>
                {sites.length} site(s) available
              </Text>
              {sites.length > 0 ? (
                <FlatList
                  data={sites}
                  scrollEnabled={false}
                  renderItem={({ item }: any) => (
                    <View style={styles.assignmentItem}>
                      <View>
                        <Text style={typography.body}>{item.name}</Text>
                        <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.xs }}>
                          {item.city}, {item.country}
                        </Text>
                      </View>
                      <TouchableOpacity style={styles.assignButton}>
                        <MaterialIcons name="add" size={24} color={colors.primary} />
                      </TouchableOpacity>
                    </View>
                  )}
                  keyExtractor={(item) => item._id}
                />
              ) : (
                <Text style={{ ...typography.small, color: colors.textTertiary }}>
                  Create sites first
                </Text>
              )}
            </View>
          </>
        )}

        <View style={styles.section}>
          <Text style={typography.h4}>Training Configuration</Text>
          <View style={styles.configCard}>
            <View style={styles.configRow}>
              <View>
                <Text style={typography.body}>Requires Training</Text>
                <Text style={{ ...typography.small, color: colors.textSecondary }}>
                  Include in daily AI-generated tests
                </Text>
              </View>
              <TouchableOpacity style={styles.toggle}>
                <View style={styles.toggleOn} />
              </TouchableOpacity>
            </View>
            <View style={styles.configRow}>
              <View>
                <Text style={typography.body}>Requires Acknowledgement</Text>
                <Text style={{ ...typography.small, color: colors.textSecondary }}>
                  Employee must sign off
              </Text>
              </View>
              <TouchableOpacity style={[styles.toggle, styles.toggleOff]}>
                <View style={styles.toggleOff} />
              </TouchableOpacity>
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
  policyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  policyItemSelected: {
    backgroundColor: colors.primary,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  policyItemContent: {
    flex: 1,
  },
  assignmentItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
  },
  assignButton: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  configCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  configRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  toggle: {
    width: 44,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.success,
    justifyContent: 'center',
    paddingHorizontal: spacing.xs,
  },
  toggleOn: {
    width: 20,
    height: 20,
    borderRadius: radius.full,
    backgroundColor: colors.background,
    alignSelf: 'flex-end',
  },
  toggleOff: {
    width: 44,
    height: 24,
    borderRadius: radius.full,
    backgroundColor: colors.border,
  },
});
