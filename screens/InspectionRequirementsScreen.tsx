import React, { useContext, useState } from 'react';
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
  SegmentedControlIOS,
  Platform,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';

type RequirementType = 'daily' | 'monthly' | 'before_use';

interface EquipmentItem {
  _id: string;
  employeeId: string;
  assetType: 'vehicle' | 'asset';
  vehicleId?: string;
  assetId?: string;
  templateId: string;
  inspectionRequirement: RequirementType;
  name?: string;
}

export default function InspectionRequirementsScreen() {
  const { user } = useContext(AuthContext);
  const [selectedRequirement, setSelectedRequirement] = useState<RequirementType>('daily');
  const [selectedEquipment, setSelectedEquipment] = useState<string | null>(null);

  // Get all company assignments
  const assignments = useQuery(api.equipmentAssignments.getCompanyAssignments, {
    companyId: user?.companyId || '',
  }) as EquipmentItem[] | undefined;

  const updateRequirement = useMutation(api.equipmentAssignments.updateInspectionRequirement);

  if (!user) {
    Alert.alert('Error', 'You must be logged in');
    return null;
  }

  const handleUpdateRequirement = async (assignmentId: string) => {
    try {
      await updateRequirement({
        assignmentId,
        inspectionRequirement: selectedRequirement,
      });
      Alert.alert('Success', 'Inspection requirement updated');
      setSelectedEquipment(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to update requirement');
    }
  };

  const getEquipmentName = (item: EquipmentItem) => {
    if (item.assetType === 'vehicle') {
      return `Vehicle Assignment #${item.employeeId.slice(0, 8)}`;
    }
    return `Equipment Assignment #${item.employeeId.slice(0, 8)}`;
  };

  const getRequirementLabel = (req: RequirementType) => {
    switch (req) {
      case 'daily':
        return { label: 'Daily', icon: 'calendar', color: '#3b82f6' };
      case 'monthly':
        return { label: 'Monthly', icon: 'calendar-outline', color: '#8b5cf6' };
      case 'before_use':
        return { label: 'Before Use', icon: 'checkmark-circle', color: '#ef4444' };
      default:
        return { label: 'Unknown', icon: 'help', color: '#6b7280' };
    }
  };

  if (!assignments) {
    return (
      <SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={{ flex: 1 }}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Equipment Inspection Requirements</Text>
          <Text style={styles.subtitle}>Set daily, monthly, or before-use inspections</Text>
        </View>

        {/* Equipment List */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Configured Equipment ({assignments.length})</Text>
          
          {assignments.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="inbox" size={48} color={colors.disabled} />
              <Text style={styles.emptyText}>No equipment assignments yet</Text>
            </View>
          ) : (
            <FlatList
              scrollEnabled={false}
              data={assignments}
              keyExtractor={(item) => item._id}
              renderItem={({ item }) => {
                const req = getRequirementLabel(item.inspectionRequirement);
                const isSelected = selectedEquipment === item._id;

                return (
                  <TouchableOpacity
                    onPress={() => {
                      setSelectedEquipment(isSelected ? null : item._id);
                      setSelectedRequirement(item.inspectionRequirement);
                    }}
                    style={[styles.equipmentCard, isSelected && styles.equipmentCardSelected]}
                  >
                    <View style={styles.equipmentInfo}>
                      <View style={styles.equipmentHeader}>
                        <Text style={styles.equipmentName}>
                          {getEquipmentName(item)}
                        </Text>
                        <View
                          style={[
                            styles.requirementBadge,
                            { backgroundColor: req.color + '20' },
                          ]}
                        >
                          <Ionicons name={req.icon as any} size={14} color={req.color} />
                          <Text style={[styles.requirementText, { color: req.color }]}>
                            {req.label}
                          </Text>
                        </View>
                      </View>
                      <Text style={styles.equipmentMeta}>
                        {item.assetType === 'vehicle' ? '🚗 Vehicle' : '🔧 Equipment'}
                      </Text>
                    </View>
                    <Ionicons
                      name={isSelected ? 'chevron-up' : 'chevron-down'}
                      size={24}
                      color={colors.primary}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>

        {/* Configuration Panel */}
        {selectedEquipment && (
          <View style={styles.configPanel}>
            <View style={styles.configHeader}>
              <Text style={styles.configTitle}>Set Inspection Requirement</Text>
              <TouchableOpacity onPress={() => setSelectedEquipment(null)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>

            {/* Requirement Options */}
            <View style={styles.optionsContainer}>
              {(['daily', 'monthly', 'before_use'] as RequirementType[]).map((req) => {
                const label = getRequirementLabel(req);
                const isSelected = selectedRequirement === req;

                return (
                  <TouchableOpacity
                    key={req}
                    onPress={() => setSelectedRequirement(req)}
                    style={[
                      styles.optionButton,
                      isSelected && styles.optionButtonSelected,
                    ]}
                  >
                    <Ionicons
                      name={label.icon as any}
                      size={28}
                      color={isSelected ? colors.primary : colors.disabled}
                    />
                    <Text
                      style={[
                        styles.optionLabel,
                        isSelected && styles.optionLabelSelected,
                      ]}
                    >
                      {label.label}
                    </Text>
                    {req === 'daily' && (
                      <Text style={styles.optionDesc}>Every day</Text>
                    )}
                    {req === 'monthly' && (
                      <Text style={styles.optionDesc}>Once per month</Text>
                    )}
                    {req === 'before_use' && (
                      <Text style={styles.optionDesc}>Before operation</Text>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleUpdateRequirement(selectedEquipment)}
            >
              <Ionicons name="checkmark-circle" size={20} color="white" />
              <Text style={styles.saveButtonText}>Save Requirement</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle" size={20} color={colors.primary} />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.infoTitle}>Inspection Types</Text>
            <Text style={styles.infoText}>
              • <Text style={{ fontWeight: '600' }}>Daily:</Text> Must inspect every day
            </Text>
            <Text style={styles.infoText}>
              • <Text style={{ fontWeight: '600' }}>Monthly:</Text> Inspect once per month
            </Text>
            <Text style={styles.infoText}>
              • <Text style={{ fontWeight: '600' }}>Before Use:</Text> Must inspect before operation
            </Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    padding: spacing.md,
    backgroundColor: colors.primary,
    paddingTop: 24,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: spacing.sm,
  },
  subtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.8)',
  },
  section: {
    padding: spacing.md,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.md,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
  },
  emptyText: {
    fontSize: 14,
    color: colors.disabled,
    marginTop: spacing.sm,
  },
  equipmentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: spacing.sm,
    marginBottom: spacing.sm,
    backgroundColor: colors.card,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  equipmentCardSelected: {
    borderColor: colors.primary,
    borderWidth: 2,
    backgroundColor: colors.primary + '08',
  },
  equipmentInfo: {
    flex: 1,
  },
  equipmentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
  equipmentName: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  requirementBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.xs,
    gap: spacing.xs,
  },
  requirementText: {
    fontSize: 11,
    fontWeight: '600',
  },
  equipmentMeta: {
    fontSize: 12,
    color: colors.disabled,
  },
  configPanel: {
    margin: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  configHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  configTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  optionsContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  optionButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  optionButtonSelected: {
    backgroundColor: colors.primary + '12',
    borderColor: colors.primary,
    borderWidth: 2,
  },
  optionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text,
    marginTop: spacing.xs,
  },
  optionLabelSelected: {
    color: colors.primary,
  },
  optionDesc: {
    fontSize: 10,
    color: colors.disabled,
    marginTop: spacing.xs,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    backgroundColor: colors.primary,
    borderRadius: radius.sm,
    gap: spacing.sm,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: 'white',
  },
  infoCard: {
    flexDirection: 'row',
    margin: spacing.md,
    padding: spacing.sm,
    backgroundColor: colors.primary + '12',
    borderRadius: radius.sm,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: 12,
    color: colors.text,
    marginBottom: spacing.sm,
  },
});