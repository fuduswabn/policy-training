import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, FlatList, Text, TouchableOpacity, TextInput, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function EmployeeListScreen({ navigation }: { navigation: any }) {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider missing');
  const { user } = auth;
  const [searchText, setSearchText] = useState('');
  const [filterDept, setFilterDept] = useState<string | null>(null);

  const employees = useQuery(
    api.hr.getCompanyEmployeesWithProfiles,
    user?.companyId
      ? {
          companyId: user.companyId as any,
          userId: user.userId as any,
        }
      : 'skip'
  );

  if (!employees) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch = emp.fullName.toLowerCase().includes(searchText.toLowerCase()) ||
                         emp.email.toLowerCase().includes(searchText.toLowerCase());
    const matchesDept = !filterDept || emp.departmentName === filterDept;
    return matchesSearch && matchesDept;
  });

  const renderEmployeeCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.employeeCard}
      onPress={() => navigation.navigate('EmployeeDetail', { employeeId: item._id })}
    >
      <View style={styles.employeeHeader}>
        <View style={styles.employeeAvatar}>
          <Text style={[typography.h3, { color: colors.surface }]}>
            {item.fullName.charAt(0)}
          </Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
            {item.fullName}
          </Text>
          <Text style={[typography.small, { color: colors.textSecondary }]}>
            {item.email}
          </Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: item.status === 'active' ? `${colors.success}20` : `${colors.warning}20` }]}>
          <Text style={[typography.small, { color: item.status === 'active' ? colors.success : colors.warning }]}>
            {item.status}
          </Text>
        </View>
      </View>
      
      <View style={styles.employeeDetails}>
        {item.jobPosition && (
          <View style={styles.detailRow}>
            <MaterialIcons name="work" size={14} color={colors.textSecondary} />
            <Text style={[typography.small, { color: colors.text, marginLeft: spacing.sm }]}>
              {item.jobPosition}
            </Text>
          </View>
        )}
        
        {item.departmentName && (
          <View style={styles.detailRow}>
            <MaterialIcons name="business" size={14} color={colors.textSecondary} />
            <Text style={[typography.small, { color: colors.text, marginLeft: spacing.sm }]}>
              {item.departmentName}
            </Text>
          </View>
        )}
        
        {item.siteName && (
          <View style={styles.detailRow}>
            <MaterialIcons name="location-on" size={14} color={colors.textSecondary} />
            <Text style={[typography.small, { color: colors.text, marginLeft: spacing.sm }]}>
              {item.siteName}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={[typography.h1, { color: colors.text }]}>Employees</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddEmployee')}
        >
          <MaterialIcons name="person-add" size={20} color={colors.background} />
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <MaterialIcons name="search" size={20} color={colors.textSecondary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search employees..."
          placeholderTextColor={colors.textTertiary}
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <MaterialIcons name="close" size={20} color={colors.textSecondary} />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredEmployees}
        renderItem={renderEmployeeCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="people-outline" size={48} color={colors.textSecondary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              No employees found
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    marginHorizontal: spacing.lg,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  searchInput: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    color: colors.text,
    fontSize: 16,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.lg,
  },
  employeeCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  employeeHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  employeeAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statusBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  employeeDetails: {
    gap: spacing.sm,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
});
