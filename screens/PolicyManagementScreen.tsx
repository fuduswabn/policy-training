import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, FlatList, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function PolicyManagementScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'draft' | 'archived'>('active');
  
  const policies = useQuery(api.policies.listCompanyPolicies, 
    user && user.companyId ? { companyId: user.companyId, userId: user.userId } : 'skip'
  ) || [];

  const filteredPolicies = policies.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = filterStatus === 'all' || (p.isActive && filterStatus === 'active') || (!p.isActive && filterStatus === 'archived');
    return matchesSearch && matchesStatus;
  });

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.title}>Policies</Text>
        <TouchableOpacity 
          style={styles.addButton}
          onPress={() => navigation.navigate('UploadPolicy')}
        >
          <MaterialIcons name="add" size={24} color="white" />
        </TouchableOpacity>
      </View>

      <View style={styles.searchSection}>
        <MaterialIcons name="search" size={20} color={colors.muted} style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search policies..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholderTextColor={colors.muted}
        />
      </View>

      <View style={styles.filterTabs}>
        {(['all', 'active', 'draft', 'archived'] as const).map(status => (
          <TouchableOpacity
            key={status}
            style={[
              styles.filterTab,
              filterStatus === status && styles.filterTabActive,
            ]}
            onPress={() => setFilterStatus(status)}
          >
            <Text style={[
              styles.filterTabText,
              filterStatus === status && styles.filterTabTextActive,
            ]}>
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {!policies ? (
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      ) : (
        <FlatList
          data={filteredPolicies}
          renderItem={({ item: policy }) => (
            <TouchableOpacity
              style={styles.policyCard}
              onPress={() => navigation.navigate('PolicyDetail', { policyId: policy._id })}
            >
              <View style={styles.policyHeader}>
                <View style={styles.policyTitleSection}>
                  <Text style={typography.subtitle}>{policy.title}</Text>
                  <Text style={styles.versionText}>v{policy.version}</Text>
                </View>
                <View style={[
                  styles.statusBadge,
                  policy.isActive ? styles.statusActive : styles.statusInactive,
                ]}>
                  <Text style={styles.statusText}>
                    {policy.isActive ? 'Active' : 'Inactive'}
                  </Text>
                </View>
              </View>

              <Text style={styles.policyTypeText}>
                {policy.policyType === 'general' ? '📋 General' : '👥 Group-specific'}
              </Text>

              <View style={styles.policyFooter}>
                <Text style={styles.dateText}>
                  Created {new Date(policy.createdAt).toLocaleDateString()}
                </Text>
                <MaterialIcons name="chevron-right" size={20} color={colors.muted} />
              </View>
            </TouchableOpacity>
          )}
          keyExtractor={item => item._id}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="folder-open" size={48} color={colors.muted} />
              <Text style={styles.emptyText}>No policies found</Text>
              <Text style={styles.emptySubtext}>Upload your first policy to get started</Text>
            </View>
          }
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  addButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: spacing.md,
    marginVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
  },
  searchIcon: {
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    height: 40,
    ...typography.body,
    color: colors.text,
  },
  filterTabs: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    gap: spacing.sm,
  },
  filterTab: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  filterTabActive: {
    backgroundColor: colors.primary,
  },
  filterTabText: {
    ...typography.small,
    color: colors.text,
  },
  filterTabTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  listContent: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.lg,
  },
  policyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  policyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  policyTitleSection: {
    flex: 1,
    marginRight: spacing.md,
  },
  versionText: {
    ...typography.small,
    color: colors.muted,
    marginTop: spacing.xs,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  statusActive: {
    backgroundColor: '#e8f5e9',
  },
  statusInactive: {
    backgroundColor: '#ffebee',
  },
  statusText: {
    ...typography.small,
    fontWeight: '600',
    color: colors.text,
  },
  policyTypeText: {
    ...typography.small,
    color: colors.muted,
    marginBottom: spacing.sm,
  },
  policyFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    ...typography.small,
    color: colors.muted,
  },
  loader: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg * 4,
  },
  emptyText: {
    ...typography.subtitle,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  emptySubtext: {
    ...typography.small,
    color: colors.muted,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
});