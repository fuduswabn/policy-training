import React, { useContext, useState } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  FlatList,
  Alert,
  Modal,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius } from '../lib/theme';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';

const FREQUENCY_OPTIONS = [
  { id: 'daily', label: 'Daily', description: 'Every day', icon: 'event-repeat' },
  { id: 'weekly', label: 'Weekly', description: 'Once per week', icon: 'event-note' },
  { id: 'monthly', label: 'Monthly', description: 'Once per month', icon: 'calendar-month' },
  { id: 'before_use', label: 'Before Use', description: 'Before equipment is used', icon: 'assignment' },
];

export default function InspectionEquipmentAssignmentScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedTemplateName, setSelectedTemplateName] = useState<string>('');
  const [selectedFrequencies, setSelectedFrequencies] = useState<string[]>([]);
  const [selectedEmployees, setSelectedEmployees] = useState<string[]>([]);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const templates = useQuery(api.inspections.getTemplates,
    user?.companyId ? { companyId: user.companyId as any } : 'skip'
  );

  const employees = useQuery(api.inspections.getCompanyEmployees,
    user?.companyId ? { companyId: user.companyId as any } : 'skip'
  );

  // Mutations
  const assignTemplate = useMutation(api.inspections.assignTemplateToEquipment);

  if (!user || !user.companyId) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text style={{ fontSize: 18, color: colors.text }}>Please log in to continue</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleAssign = async () => {
    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select an inspection template');
      return;
    }
    if (selectedEmployees.length === 0) {
      Alert.alert('Error', 'Please select at least one employee');
      return;
    }
    if (selectedFrequencies.length === 0) {
      Alert.alert('Error', 'Please select at least one frequency');
      return;
    }

    setIsSubmitting(true);
    try {
      for (const employeeId of selectedEmployees) {
        for (const frequency of selectedFrequencies) {
          await assignTemplate({
            companyId: user.companyId as any,
            employeeId: employeeId as any,
            templateId: selectedTemplate as any,
            inspectionFrequency: frequency as any,
            assignedBy: user.userId as any,
          });
        }
      }

      Alert.alert(
        'Success',
        `Inspection assigned to ${selectedEmployees.length} employee${selectedEmployees.length > 1 ? 's' : ''}`
      );

      // Reset form
      setSelectedTemplate(null);
      setSelectedTemplateName('');
      setSelectedEmployees([]);
      setSelectedFrequencies([]);
    } catch (error: any) {
      console.error('Assignment error:', error);
      Alert.alert('Error', error?.message || 'Failed to assign inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const employeeNames = (employees || [])
    .filter((e: any) => selectedEmployees.includes(e._id))
    .map((e: any) => e.fullName)
    .join(', ');

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Assign Inspections
        </Text>
      </SafeAreaView>

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 3 }}
        keyboardShouldPersistTaps="handled"
      >
        {/* Template Selection */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
            Select Template
          </Text>
          <TouchableOpacity
            onPress={() => {
              if ((templates || []).length === 0) {
                Alert.alert('No templates', 'No inspection templates available. Create one first.');
                return;
              }
              setShowTemplateModal(true);
            }}
            style={[
              styles.selectionButton,
              {
                borderColor: selectedTemplate ? colors.primary : colors.border,
                borderWidth: 2,
                backgroundColor: selectedTemplate ? colors.primary + '10' : colors.surface,
              }
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                color: selectedTemplate ? colors.text : colors.textSecondary,
                fontWeight: selectedTemplate ? '600' : '400',
              }}>
                {selectedTemplateName || 'Select template'}
              </Text>
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Frequency Selection */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
            Inspection Frequencies (Select One or More)
          </Text>
          <View style={{ gap: spacing.md }}>
            {FREQUENCY_OPTIONS.map((freq) => (
              <TouchableOpacity
                key={freq.id}
                onPress={() => {
                  setSelectedFrequencies((prev: string[]) =>
                    prev.includes(freq.id)
                      ? prev.filter((f: string) => f !== freq.id)
                      : [...prev, freq.id]
                  );
                }}
                style={[
                  styles.frequencyOption,
                  selectedFrequencies.includes(freq.id) && { backgroundColor: colors.primary + '20', borderColor: colors.primary }
                ]}
              >
                <MaterialIcons
                  name={freq.icon as any}
                  size={24}
                  color={selectedFrequencies.includes(freq.id) ? colors.primary : colors.textSecondary}
                />
                <View style={{ flex: 1, marginLeft: spacing.md }}>
                  <Text style={{
                    fontWeight: selectedFrequencies.includes(freq.id) ? '600' : '400',
                    color: colors.text,
                  }}>
                    {freq.label}
                  </Text>
                  <Text style={{ fontSize: 12, color: colors.textSecondary, marginTop: 2 }}>
                    {freq.description}
                  </Text>
                </View>
                <View style={{
                  width: 24,
                  height: 24,
                  borderRadius: 4,
                  borderWidth: 2,
                  borderColor: selectedFrequencies.includes(freq.id) ? colors.primary : colors.border,
                  backgroundColor: selectedFrequencies.includes(freq.id) ? colors.primary : 'transparent',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  {selectedFrequencies.includes(freq.id) && (
                    <Text style={{ color: colors.background, fontWeight: 'bold' }}>✓</Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Employee Selection */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
            Assign To Employees
          </Text>
          <TouchableOpacity
            onPress={() => {
              if ((employees || []).length === 0) {
                Alert.alert('No employees', 'No employees available');
                return;
              }
              setShowEmployeeModal(true);
            }}
            style={[
              styles.selectionButton,
              {
                borderColor: selectedEmployees.length > 0 ? colors.primary : colors.border,
                borderWidth: 2,
                backgroundColor: selectedEmployees.length > 0 ? colors.primary + '10' : colors.surface,
              }
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={{
                color: selectedEmployees.length > 0 ? colors.text : colors.textSecondary,
                fontWeight: selectedEmployees.length > 0 ? '600' : '400',
              }}>
                {selectedEmployees.length === 0 ? 'Select employees' : `${selectedEmployees.length} selected`}
              </Text>
              {selectedEmployees.length > 0 && (
                <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 4 }}>
                  {employeeNames}
                </Text>
              )}
            </View>
            <Ionicons name="chevron-down" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {selectedTemplate && selectedEmployees.length > 0 && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
              Assignment Summary
            </Text>
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary }}>Template:</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {selectedTemplateName}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary }}>Frequencies:</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {selectedFrequencies.length} selected
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary }}>Employees:</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {selectedEmployees.length}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Assign Button */}
        <TouchableOpacity
          onPress={handleAssign}
          disabled={!selectedTemplate || selectedEmployees.length === 0 || selectedFrequencies.length === 0 || isSubmitting}
          style={[
            styles.assignButton,
            {
              backgroundColor:
                !selectedTemplate || selectedEmployees.length === 0 || selectedFrequencies.length === 0 || isSubmitting
                  ? colors.textSecondary
                  : colors.primary,
            }
          ]}
        >
          <Text style={{ color: colors.background, fontWeight: '600', fontSize: 16 }}>
            {isSubmitting ? 'Assigning...' : 'Assign Inspection'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Template Modal */}
      <Modal visible={showTemplateModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                Select Template
              </Text>
              <TouchableOpacity onPress={() => setShowTemplateModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={templates}
              keyExtractor={(item: any) => item._id}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedTemplate(item._id);
                    setSelectedTemplateName(item.name);
                    setShowTemplateModal(false);
                  }}
                  style={[styles.option, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colors.text }}>
                      {item.name}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {item.checklist?.length || 0} items
                    </Text>
                  </View>
                  {selectedTemplate === item._id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>

      {/* Employee Modal */}
      <Modal visible={showEmployeeModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                Select Employees
              </Text>
              <TouchableOpacity onPress={() => setShowEmployeeModal(false)}>
                <Ionicons name="close" size={24} color={colors.text} />
              </TouchableOpacity>
            </View>
            <FlatList
              data={employees}
              keyExtractor={(item: any) => item._id}
              renderItem={({ item }: { item: any }) => (
                <TouchableOpacity
                  onPress={() => {
                    setSelectedEmployees((prev: any) =>
                      prev.includes(item._id)
                        ? prev.filter((id: any) => id !== item._id)
                        : [...prev, item._id]
                    );
                  }}
                  style={[styles.option, { borderBottomColor: colors.border }]}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontWeight: '600', color: colors.text }}>
                      {item.fullName}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {item.email}
                    </Text>
                  </View>
                  <View style={{
                    width: 24,
                    height: 24,
                    borderRadius: 4,
                    borderWidth: 2,
                    borderColor: selectedEmployees.includes(item._id) ? colors.primary : colors.border,
                    backgroundColor: selectedEmployees.includes(item._id) ? colors.primary : 'transparent',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}>
                    {selectedEmployees.includes(item._id) && (
                      <Text style={{ color: colors.background, fontWeight: 'bold' }}>✓</Text>
                    )}
                  </View>
                </TouchableOpacity>
              )}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
    flex: 1,
    marginLeft: spacing.md,
  },
  selectionButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  frequencyOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  summaryCard: {
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
  },
  assignButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  modalContent: {
    flex: 1,
    marginTop: '15%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  option: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
});