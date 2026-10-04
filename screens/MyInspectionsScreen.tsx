import React, { useContext, useState } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useQuery } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';

const FREQUENCIES = [
  { id: 'daily', label: 'Daily', icon: 'event-repeat', color: colors.primary },
  { id: 'weekly', label: 'Weekly', icon: 'event-note', color: '#FF9500' },
  { id: 'monthly', label: 'Monthly', icon: 'calendar-month', color: '#5856D6' },
  { id: 'before_use', label: 'Before Use', icon: 'assignment', color: '#FF3B30' },
];

export default function MyInspectionsScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const [selectedFrequency, setSelectedFrequency] = useState<string>('daily');
  const [unlockedBeforeUse, setUnlockedBeforeUse] = useState<Set<string>>(new Set());

  const assignedInspections = useQuery(
    api.inspections.getEmployeeAssignments,
    user?.userId && user?.companyId
      ? {
          employeeId: user.userId as any,
          companyId: user.companyId as any,
        }
      : 'skip'
  );

  const templates = useQuery(
    api.inspections.getTemplates,
    user?.companyId ? { companyId: user.companyId as any } : 'skip'
  );

  // Get all assigned inspections for current employee organized by frequency
  const dailyInspections = useQuery(
    api.inspections.getPendingInspectionsByFrequency,
    user?.userId && user?.companyId
      ? {
          employeeId: user.userId as any,
          companyId: user.companyId as any,
          frequency: 'daily',
        }
      : 'skip'
  );

  const weeklyInspections = useQuery(
    api.inspections.getPendingInspectionsByFrequency,
    user?.userId && user?.companyId
      ? {
          employeeId: user.userId as any,
          companyId: user.companyId as any,
          frequency: 'weekly',
        }
      : 'skip'
  );

  const monthlyInspections = useQuery(
    api.inspections.getPendingInspectionsByFrequency,
    user?.userId && user?.companyId
      ? {
          employeeId: user.userId as any,
          companyId: user.companyId as any,
          frequency: 'monthly',
        }
      : 'skip'
  );

  const beforeUseInspections = useQuery(
    api.inspections.getPendingInspectionsByFrequency,
    user?.userId && user?.companyId
      ? {
          employeeId: user.userId as any,
          companyId: user.companyId as any,
          frequency: 'before_use',
        }
      : 'skip'
  );

  const inspectionsByFreq = {
    daily: dailyInspections || [],
    weekly: weeklyInspections || [],
    monthly: monthlyInspections || [],
    before_use: beforeUseInspections || [],
  };

  const pendingManagerInspections = assignedInspections || [];
  const templateNameById = (templateId: string) => templates?.find((template: any) => template._id === templateId)?.name;

  const selectedInspections = inspectionsByFreq[selectedFrequency as keyof typeof inspectionsByFreq] || [];
  const frequencyInfo = FREQUENCIES.find(f => f.id === selectedFrequency);

  const handleStartInspection = (inspection: any) => {
    if (selectedFrequency === 'before_use' && !unlockedBeforeUse.has(inspection._id)) {
      Alert.alert(
        'Before Use Inspection',
        'This inspection must be completed before using this equipment. Click to confirm you want to start.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unlock & Start',
            onPress: () => {
              setUnlockedBeforeUse((prev: Set<string>) => new Set([...prev, inspection._id]));
              navigation.navigate('InspectionChecklist', {
                templateId: inspection.templateId,
                assetType: inspection.vehicleId ? 'vehicle' : 'asset',
                vehicleId: inspection.vehicleId,
                assetId: inspection.assetId,
              });
            },
          },
        ]
      );
    } else {
      navigation.navigate('InspectionChecklist', {
        templateId: inspection.templateId,
        assetType: inspection.vehicleId ? 'vehicle' : 'asset',
        vehicleId: inspection.vehicleId,
        assetId: inspection.assetId,
      });
    }
  };

  if (!user || !user.companyId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 16, color: colors.textSecondary }}>
            Please log in to continue
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text }}>
          My Inspections
        </Text>
        <View style={{ width: 24 }} />
      </View>

      {pendingManagerInspections.length > 0 && (
        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.lg }}>
          <Text style={{ fontSize: 16, fontWeight: '700', color: colors.text, marginBottom: spacing.md }}>
            Assigned by Manager
          </Text>
          {pendingManagerInspections.map((item: any) => (
            <TouchableOpacity
              key={item._id}
              onPress={() => navigation.navigate('InspectionChecklist', {
                templateId: item.templateId,
                assetType: item.assetType || (item.vehicleId ? 'vehicle' : item.assetId ? 'asset' : 'general'),
                vehicleId: item.vehicleId,
                assetId: item.assetId,
              })}
              style={[styles.inspectionCard, { marginBottom: spacing.md }]}
            >
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: '600', color: colors.text, fontSize: 15 }}>
                  {templateNameById(item.templateId) || 'Manager Assigned Inspection'}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                  Due: {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'No due date'}
                </Text>
                <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>
                  Tap to open and complete
                </Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Frequency Tabs */}
      <View style={styles.tabsContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {FREQUENCIES.map(freq => (
            <TouchableOpacity
              key={freq.id}
              onPress={() => setSelectedFrequency(freq.id)}
              style={[
                styles.tab,
                selectedFrequency === freq.id && {
                  backgroundColor: freq.color + '20',
                  borderBottomWidth: 3,
                  borderBottomColor: freq.color,
                },
              ]}
            >
              <MaterialIcons
                name={freq.icon as any}
                size={20}
                color={selectedFrequency === freq.id ? freq.color : colors.textSecondary}
              />
              <Text
                style={{
                  marginLeft: spacing.xs,
                  fontWeight: selectedFrequency === freq.id ? '600' : '400',
                  color: selectedFrequency === freq.id ? freq.color : colors.textSecondary,
                }}
              >
                {freq.label}
              </Text>
              {inspectionsByFreq[freq.id as keyof typeof inspectionsByFreq]?.length > 0 && (
                <View
                  style={{
                    marginLeft: spacing.xs,
                    backgroundColor: freq.color,
                    borderRadius: 10,
                    minWidth: 20,
                    paddingHorizontal: 6,
                    paddingVertical: 2,
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: colors.background, fontSize: 11, fontWeight: 'bold' }}>
                    {inspectionsByFreq[freq.id as keyof typeof inspectionsByFreq]?.length}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Content */}
      <ScrollView style={{ flex: 1, padding: spacing.lg }}>
        {/* Frequency Info Card */}
        {frequencyInfo && (
          <View
            style={[
              styles.infoCard,
              { borderLeftColor: frequencyInfo.color, backgroundColor: frequencyInfo.color + '10' },
            ]}
          >
            <MaterialIcons name={frequencyInfo.icon as any} size={24} color={frequencyInfo.color} />
            <View style={{ flex: 1, marginLeft: spacing.md }}>
              <Text style={{ fontWeight: '600', color: colors.text }}>
                {frequencyInfo.label} Inspections
              </Text>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 4 }}>
                {selectedFrequency === 'before_use'
                  ? 'Complete these before using equipment'
                  : selectedFrequency === 'daily'
                  ? 'These must be completed every day'
                  : selectedFrequency === 'weekly'
                  ? 'These must be completed once per week'
                  : 'These must be completed once per month'}
              </Text>
            </View>
          </View>
        )}

        {/* Loading State */}
        {selectedInspections === undefined ? (
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl }}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={{ marginTop: spacing.md, color: colors.textSecondary }}>
              Loading inspections...
            </Text>
          </View>
        ) : selectedInspections.length === 0 ? (
          <View style={{ justifyContent: 'center', alignItems: 'center', paddingVertical: spacing.xl }}>
            <MaterialIcons name="check-circle" size={48} color={colors.textTertiary} />
            <Text style={{ marginTop: spacing.md, fontSize: 16, fontWeight: '600', color: colors.text }}>
              No inspections
            </Text>
            <Text style={{ marginTop: spacing.xs, color: colors.textSecondary }}>
              {selectedFrequency === 'before_use'
                ? 'You have no before-use inspections assigned'
                : `You have no ${frequencyInfo?.label.toLowerCase()} inspections`}
            </Text>
          </View>
        ) : (
          <FlatList
            data={selectedInspections}
            keyExtractor={(item: any) => item._id}
            scrollEnabled={false}
            renderItem={({ item }: { item: any }) => (
              <TouchableOpacity
                onPress={() => handleStartInspection(item)}
                style={[
                  styles.inspectionCard,
                  selectedFrequency === 'before_use' &&
                  !unlockedBeforeUse.has(item._id) && {
                    opacity: 0.7,
                    borderStyle: 'dashed',
                  },
                ]}
              >
                <View
                  style={{
                    width: 50,
                    height: 50,
                    borderRadius: radius.md,
                    backgroundColor: frequencyInfo?.color + '20',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <MaterialIcons
                    name={frequencyInfo?.icon as any}
                    size={28}
                    color={frequencyInfo?.color}
                  />
                </View>

                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{ fontWeight: '600', color: colors.text, fontSize: 15 }}>
                    {item.templateName}
                  </Text>
                  <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 2 }}>
                    Equipment: {item.assetName}
                  </Text>
                  {item.notes && (
                    <Text style={{ color: colors.textTertiary, fontSize: 12, marginTop: 4 }}>
                      Note: {item.notes}
                    </Text>
                  )}
                </View>

                <View style={{ alignItems: 'flex-end' }}>
                  {selectedFrequency === 'before_use' && !unlockedBeforeUse.has(item._id) ? (
                    <View style={{ alignItems: 'center' }}>
                      <MaterialIcons name="lock" size={24} color={colors.warning} />
                      <Text style={{ fontSize: 10, color: colors.warning, marginTop: 2 }}>
                        Locked
                      </Text>
                    </View>
                  ) : (
                    <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
                  )}
                </View>
              </TouchableOpacity>
            )}
            ItemSeparatorComponent={() => <View style={{ height: spacing.md }} />}
          />
        )}
      </ScrollView>
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
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabsContainer: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.md,
    borderRadius: radius.md,
  },
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: spacing.md,
    borderRadius: radius.lg,
    borderLeftWidth: 4,
    marginBottom: spacing.lg,
  },
  inspectionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
});