import React, { useContext } from 'react';
import { StyleSheet, View, FlatList, Text, TouchableOpacity, ActivityIndicator, SafeAreaView } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function SiteListScreen({ navigation }: { navigation: any }) {
  const auth = useContext(AuthContext);
  if (!auth) throw new Error('AuthProvider missing');
  const { user } = auth;

  const sites = useQuery(
    api.hr.getSites,
    user?.companyId
      ? {
          companyId: user.companyId as any,
          userId: user.userId as any,
        }
      : 'skip'
  );

  const renderSiteCard = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.siteCard}
      onPress={() => navigation.navigate('SiteDetail', { siteId: item._id })}
    >
      <View style={styles.cardHeader}>
        <View style={[styles.iconContainer, { backgroundColor: `${colors.secondary}20` }]}>
          <MaterialIcons name="location-on" size={24} color={colors.secondary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[typography.body, { color: colors.text, fontWeight: '600' }]}>
            {item.name}
          </Text>
          {item.city && item.country && (
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              {item.city}, {item.country}
            </Text>
          )}
          {item.managerName && (
            <Text style={[typography.small, { color: colors.textSecondary }]}>
              Manager: {item.managerName}
            </Text>
          )}
        </View>
        <View style={[styles.activeBadge, { backgroundColor: item.isActive ? `${colors.success}20` : `${colors.error}20` }]}>
          <Text style={[typography.small, { color: item.isActive ? colors.success : colors.error }]}>
            {item.isActive ? 'Active' : 'Inactive'}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  if (!sites) {
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
        <Text style={[typography.h1, { color: colors.text }]}>Sites/Locations</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddSite')}
        >
          <MaterialIcons name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={sites}
        renderItem={renderSiteCard}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <MaterialIcons name="place" size={48} color={colors.textSecondary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              No sites yet
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
  siteCard: {
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
