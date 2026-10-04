import React, { useContext, useState, useEffect } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  SafeAreaView,
  FlatList,
  Alert,
  ActivityIndicator,
  StyleSheet,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

interface InspectionTask {
  _id: string;
  assignmentId: string;
  assetType: 'vehicle' | 'asset';
  vehicleId?: string;
  assetId?: string;
  status: 'pending' | 'completed' | 'overdue';
  templateId: string;
}

export default function DailyInspectionsScreen({ navigation }: any) {
  const { user, company } = useContext(AuthContext);
  const [todaysDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0]; // "YYYY-MM-DD"
  });
  const [selectedFrequency, setSelectedFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'before_use'>('daily');

  // Move all hooks to the top, before any conditional returns
  const todaysPendingInspections = useQuery(
    api.equipmentAssignments?.getTodaysPendingInspections || 'skip',
    user?.userId ? { employeeId: user.userId as any, date: todaysDate } : 'skip'
  ) || [];

  const companyStatus = useQuery(
    api.equipmentAssignments?.getCompanyDailyStatus || 'skip',
    company?.companyId ? { companyId: company.companyId as any, date: todaysDate } : 'skip'
  );

  if (!user || !company) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: colors.text }}>
            Please log in to continue
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const completedCount = todaysPendingInspections.filter(
    (t: any) => t.status === 'completed'
  ).length;
  const completionPercentage =
    todaysPendingInspections.length > 0
      ? (completedCount / todaysPendingInspections.length) * 100
      : 0;

  const handleStartInspection = (task: InspectionTask) => {
    navigation.navigate('VehicleInspection', {
      assignmentId: task.assignmentId,
      templateId: task.templateId,
      assetType: task.assetType,
      vehicleId: task.vehicleId,
      assetId: task.assetId,
      checkId: task._id,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return colors.success;
      case 'pending':
        return colors.warning;
      case 'overdue':
        return colors.error;
      default:
        return colors.textSecondary;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle';
      case 'pending':
        return 'ellipse';
      case 'overdue':
        return 'alert-circle';
      default:
        return 'help-circle';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        {/* Header with date */}
        <View style={{ padding: spacing.lg, backgroundColor: colors.surface }}>
          <Text style={{ fontSize: 18, color: colors.textSecondary, marginBottom: spacing.xs }}>
            Daily Inspections
          </Text>
          <Text style={{ fontSize: 28, fontWeight: 'bold', color: colors.text }}>
            {new Date(todaysDate).toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        {/* Frequency Tabs */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ backgroundColor: colors.background, paddingHorizontal: spacing.lg, paddingVertical: spacing.md }}
        >
          {[
            { id: 'daily', label: 'Daily' },
            { id: 'weekly', label: 'Weekly' },
            { id: 'monthly', label: 'Monthly' },
            { id: 'before_use', label: 'Before Use' },
          ].map((freq: any) => (
            <TouchableOpacity
              key={freq.id}
              onPress={() => setSelectedFrequency(freq.id)}
              style={{
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm,
                borderRadius: radius.md,
                backgroundColor: selectedFrequency === freq.id ? colors.primary : colors.surface,
                marginRight: spacing.sm,
              }}
            >
              <Text
                style={{
                  color: selectedFrequency === freq.id ? colors.background : colors.text,
                  fontWeight: '600',
                }}
              >
                {freq.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* Progress Overview */}
        <View style={{ padding: spacing.lg, backgroundColor: colors.surface, margin: spacing.md }}>
          <View style={{ marginBottom: spacing.md }}>
            <View
              style={{
                flexDirection: 'row',
                justifyContent: 'space-between',
                marginBottom: spacing.sm,
              }}
            >
              <Text style={{ fontWeight: '600', color: colors.text }}>
                Daily Progress
              </Text>
              <Text
                style={{
                  fontWeight: 'bold',
                  fontSize: 18,
                  color: colors.primary,
                }}
              >
                {completedCount} / {todaysPendingInspections.length}
              </Text>
            </View>
            {/* Progress bar */}
            <View
              style={{
                height: 8,
                backgroundColor: colors.background,
                borderRadius: radius.sm,
                overflow: 'hidden',
              }}
            >
              <View
                style={{
                  height: '100%',
                  width: `${completionPercentage}%`,
                  backgroundColor: colors.success,
                }}
              />
            </View>
          </View>
          <Text style={{ color: colors.textSecondary, fontSize: 14 }}>
            {Math.round(completionPercentage)}% Complete
          </Text>
        </View>

        {/* Company Status (Manager view) */}
        {companyStatus && (
          <View
            style={{
              padding: spacing.lg,
              backgroundColor: colors.surface,
              margin: spacing.md,
              borderRadius: radius.md,
            }}
          >
            <Text
              style={{
                fontWeight: '600',
                color: colors.text,
                marginBottom: spacing.md,
              }}
            >
              Company Status
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: colors.primary,
                  }}
                >
                  {companyStatus.completed}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Completed
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: colors.warning,
                  }}
                >
                  {companyStatus.pending}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Pending
                </Text>
              </View>
              <View style={{ alignItems: 'center' }}>
                <Text
                  style={{
                    fontSize: 24,
                    fontWeight: 'bold',
                    color: colors.error,
                  }}
                >
                  {companyStatus.overdue}
                </Text>
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                  Overdue
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Tasks List */}
        <View style={{ padding: spacing.lg }}>
          <Text
            style={{
              fontSize: 18,
              fontWeight: 'bold',
              color: colors.text,
              marginBottom: spacing.md,
            }}
          >
            Your Inspections ({todaysPendingInspections.length})
          </Text>

          {todaysPendingInspections.length === 0 ? (
            <View
              style={{
                padding: spacing.lg,
                backgroundColor: colors.surface,
                borderRadius: radius.md,
                alignItems: 'center',
              }}
            >
              <Ionicons
                name="checkmark-done-circle"
                size={48}
                color={colors.success}
                style={{ marginBottom: spacing.md }}
              />
              <Text
                style={{
                  fontSize: 16,
                  fontWeight: '600',
                  color: colors.text,
                  marginBottom: spacing.sm,
                }}
              >
                All Set!
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                No inspections assigned for today
              </Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={todaysPendingInspections}
              keyExtractor={(item: any) => item._id}
              renderItem={({ item: task }: { item: InspectionTask }) => (
                <TouchableOpacity
                  onPress={() =>
                    task.status === 'completed'
                      ? null
                      : handleStartInspection(task)
                  }
                  disabled={task.status === 'completed'}
                  style={{
                    padding: spacing.md,
                    backgroundColor: colors.surface,
                    borderRadius: radius.md,
                    marginBottom: spacing.md,
                    borderLeftWidth: 4,
                    borderLeftColor: getStatusColor(task.status),
                    opacity: task.status === 'completed' ? 0.6 : 1,
                  }}
                >
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          marginBottom: spacing.xs,
                        }}
                      >
                        <Ionicons
                          name={getStatusIcon(task.status) as any}
                          size={20}
                          color={getStatusColor(task.status)}
                          style={{ marginRight: spacing.sm }}
                        />
                        <Text
                          style={{
                            fontWeight: '600',
                            color: colors.text,
                            fontSize: 16,
                          }}
                        >
                          {task.assetType === 'vehicle'
                            ? 'Vehicle Inspection'
                            : 'Equipment Check'}
                        </Text>
                      </View>
                      <Text
                        style={{
                          color: colors.textSecondary,
                          fontSize: 13,
                          marginLeft: 28,
                        }}
                      >
                        Status:{' '}
                        <Text
                          style={{
                            fontWeight: '600',
                            color: getStatusColor(task.status),
                            textTransform: 'capitalize',
                          }}
                        >
                          {task.status}
                        </Text>
                      </Text>
                    </View>
                    {task.status !== 'completed' && (
                      <Ionicons
                        name="chevron-forward"
                        size={24}
                        color={colors.primary}
                      />
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}