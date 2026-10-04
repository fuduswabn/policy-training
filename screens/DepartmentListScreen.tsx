import React, { useContext, useState } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function DepartmentListScreen({ navigation }: { navigation: any }) {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider missing');
  const { user } = auth;

  const departments = useQuery(
    api.hr.getDepartments,
    user?.companyId
      ? {
          companyId: user.companyId as any,
          userId: user.userId as any,
        }
      : 'skip'
  );

  const renderDepartmentCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.departmentCard}
      onPress={() => navigation.navigate('DepartmentDetail', { departmentId: item._id })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.primary}20` }]}>
          <MaterialIcons name="business" size={24} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
            {item.name}
          </Text>
          {item.headName && (
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              Head: {item.headName}
            </Text>
          )}
        </View>
        <View style={[styles.activeBadge, { backgroundColor: item.isActive ? `${colors.success}20` : `${colors.error}20` }]}>
          <Text style={[typography.small, { color: item.isActive ? colors.success : colors.error }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
      {item.description && (
        <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.sm }]}>
          {item.description}
        </Text>
      )}
    </TouchableOpacity>
  );

  if (!departments) {
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
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.text }]}>Departments</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddDepartment')}
        >
          <MaterialIcons name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={departments}
        renderItem={renderDepartmentCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="business-center" size={48} color={colors.textSecondary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              No departments yet
            </Text>
          </View>
        }
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  addButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  departmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  activeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
});
