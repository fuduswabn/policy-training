import React, { useContext, useState, useEffect, useMemo } from 'react';
import {
  ScrollView,
  TouchableOpacity,
  View,
  Text,
  FlatList,
  Alert,
  Modal,
  StyleSheet,
} from 'react-native';
import { useQuery, useMutation } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius } from '../lib/theme';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function InspectionAssignmentScreen({ navigation }: any) {
  const { user } = useContext(AuthContext);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);
  const [selectedEmployeeName, setSelectedEmployeeName] = useState<string>('');
  const [dueDate, setDueDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Queries
  const rawTemplates = useQuery(api.inspections.getTemplates, 
    user?.companyId ? { companyId: user.companyId as any } : 'skip'
  );

  const rawEmployees = useQuery(api.inspections.getCompanyEmployees,
    user?.companyId ? { companyId: user.companyId as any } : 'skip'
  );

  const templates = useMemo(() => rawTemplates || [], [rawTemplates]);
  const employees = useMemo(() => rawEmployees || [], [rawEmployees]);

  // Mutations
  const assignInspection = useMutation(api.inspections.assignInspectionToEmployee);

  // Debug logging
  useEffect(() => {
    console.log('Templates loaded:', templates?.length || 0);
    console.log('Employees loaded:', employees?.length || 0);
    console.log('Selected template:', selectedTemplate);
    console.log('Selected employee:', selectedEmployee);
  }, [templates, employees, selectedTemplate, selectedEmployee]);

  if (!user || !user.companyId) {
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

  const handleDateChange = (event: any, selectedDate: any) => {
    if (selectedDate) {
      setDueDate(selectedDate);
    }
    setShowDatePicker(false);
  };

  const handleAssign = async () => {
    if (!selectedTemplate) {
      Alert.alert('Error', 'Please select an inspection template');
      return;
    }
    
    if (!selectedEmployee) {
      Alert.alert('Error', 'Please select an employee to assign to');
      return;
    }

    setIsSubmitting(true);
    try {
      console.log('Assigning inspection with:', {
        companyId: user.companyId,
        templateId: selectedTemplate,
        assignedToUserId: selectedEmployee,
        dueDate: dueDate.getTime(),
      });

      await assignInspection({
        companyId: user.companyId as any,
        templateId: selectedTemplate as any,
        assignedToUserId: selectedEmployee as any,
        dueDate: dueDate.getTime(),
        assetType: 'general',
        assignedBy: user.userId as any,
      });

      Alert.alert('Success', `Inspection assigned to ${selectedEmployeeName}`);
      setSelectedTemplate(null);
      setSelectedEmployee(null);
      setSelectedEmployeeName('');
      setDueDate(new Date());
    } catch (error: any) {
      console.error('Assignment error:', error);
      Alert.alert('Error', error?.message || 'Failed to assign inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedTemplateData = templates.find((t: any) => t._id === selectedTemplate);
  const isReady = templates.length > 0 && employees.length > 0;
  const isButtonDisabled = !selectedTemplate || !selectedEmployee || isSubmitting;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <SafeAreaView edges={['top']} style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          Assign Inspection
        </Text>
      </SafeAreaView>

      <ScrollView 
        style={{ flex: 1 }}
        contentContainerStyle={{ padding: spacing.lg, paddingBottom: spacing.xxl * 3 }}
        keyboardShouldPersistTaps="handled"
      >
        {!isReady && (
          <View style={{ padding: spacing.lg, backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              Loading templates and employees...
            </Text>
          </View>
        )}

        {/* Template Selection */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
            Select Inspection Template
          </Text>
          {templates.length === 0 ? (
            <View style={{ padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md }}>
              <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
                No templates available
              </Text>
            </View>
          ) : (
            <>
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: spacing.md }}>
                {templates.length} template{templates.length !== 1 ? 's' : ''} available
              </Text>
              <FlatList
                scrollEnabled={false}
                data={templates}
                keyExtractor={(item: any, index: number) => `${item._id}-${index}`}
                renderItem={({ item, index }: { item: any; index: number }) => (
                  <TouchableOpacity
                    onPress={() => {
                      console.log('Template clicked:', item._id, item.name);
                      setSelectedTemplate(item._id);
                    }}
                    activeOpacity={0.6}
                    style={[
                      styles.templateCard,
                      selectedTemplate === item._id ? styles.templateCardSelected : null,
                    ]}
                  >
                    <View
                      style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        borderWidth: 2,
                        borderColor: selectedTemplate === item._id ? colors.primary : colors.border,
                        backgroundColor: selectedTemplate === item._id ? colors.primary : 'transparent',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: spacing.md,
                      }}
                    >
                      {selectedTemplate === item._id && (
                        <Text style={{ color: colors.background, fontWeight: 'bold', fontSize: 14 }}>✓</Text>
                      )}
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontWeight: '600', color: colors.text }}>
                        {item.name}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                        {item.checklist?.length || 0} items {selectedTemplate === item._id ? '• Selected' : ''}
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}
              />
            </>
          )}
        </View>

        {/* Employee Selection */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
            Assign To
          </Text>
          <TouchableOpacity
            onPress={() => {
              if (employees.length === 0) {
                Alert.alert('No employees', 'There are no employees in your company.');
                return;
              }
              console.log('Employee selector opened, available employees:', employees.length);
              setShowEmployeeModal(true);
            }}
            activeOpacity={0.6}
            style={[
              styles.selectionButton,
              {
                borderColor: selectedEmployee ? colors.primary : colors.border,
                borderWidth: 2,
                backgroundColor: selectedEmployee ? colors.primary + '10' : colors.surface,
              },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text
                style={{
                  color: selectedEmployee ? colors.text : colors.textSecondary,
                  fontWeight: selectedEmployee ? '600' : '400',
                }}
              >
                {selectedEmployeeName || (employees.length === 0 ? 'No employees available' : 'Tap to select employee')}
              </Text>
              {employees.length > 0 && !selectedEmployee && (
                <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {employees.length} employee{employees.length !== 1 ? 's' : ''} available
                </Text>
              )}
            </View>
            <Ionicons name={selectedEmployee ? 'checkmark-circle' : 'chevron-down'} size={20} color={selectedEmployee ? colors.primary : colors.textSecondary} />
          </TouchableOpacity>
        </View>

        {/* Due Date Selection */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text, marginBottom: spacing.md }}>
            Due Date
          </Text>
          <TouchableOpacity
            onPress={() => setShowDatePicker(true)}
            activeOpacity={0.6}
            style={styles.selectionButton}
          >
            <Text style={{ color: colors.text }}>
              {dueDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </Text>
            <Ionicons name="calendar" size={20} color={colors.primary} />
          </TouchableOpacity>
        </View>

        {/* Summary */}
        {selectedTemplate && selectedEmployee && (
          <View style={[styles.summaryCard, { backgroundColor: colors.surface }]}>
            <Text style={{ fontSize: 14, fontWeight: '600', color: colors.text, marginBottom: spacing.md }}>
              Assignment Summary
            </Text>
            <View style={{ gap: spacing.sm }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary }}>Template:</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {selectedTemplateData?.name}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary }}>Employee:</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {selectedEmployeeName}
                </Text>
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: colors.textSecondary }}>Due:</Text>
                <Text style={{ color: colors.text, fontWeight: '600' }}>
                  {dueDate.toLocaleDateString()}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Status Message */}
        {isButtonDisabled && selectedTemplate && !selectedEmployee && (
          <View style={{ padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              ⚠️ Please select an employee to continue
            </Text>
          </View>
        )}

        {isButtonDisabled && !selectedTemplate && selectedEmployee && (
          <View style={{ padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center' }}>
              ⚠️ Please select a template to continue
            </Text>
          </View>
        )}

        {isButtonDisabled && !selectedTemplate && !selectedEmployee && (
          <View style={{ padding: spacing.md, backgroundColor: colors.surface, borderRadius: radius.md, marginBottom: spacing.lg }}>
            <Text style={{ color: colors.textSecondary, textAlign: 'center', fontWeight: '600' }}>
              📋 Select a template and choose an employee above
            </Text>
          </View>
        )}

        {/* Assign Button */}
        <TouchableOpacity
          onPress={handleAssign}
          disabled={isButtonDisabled}
          activeOpacity={isButtonDisabled ? 1 : 0.7}
          style={[
            styles.assignButton,
            { backgroundColor: isButtonDisabled ? colors.textSecondary : colors.primary },
          ]}
        >
          <Text style={{ color: colors.background, fontWeight: '600', fontSize: 16 }}>
            {isSubmitting ? 'Assigning...' : 'Assign Inspection'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Date Picker */}
      {showDatePicker && (
        <DateTimePicker
          value={dueDate}
          mode="date"
          display="default"
          onChange={handleDateChange}
          minimumDate={new Date()}
        />
      )}

      {/* Employee Selection Modal */}
      <Modal visible={showEmployeeModal} transparent animationType="slide">
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <View style={[styles.modalContent, { backgroundColor: colors.background }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text }}>
                Select Employee
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
                    console.log('Employee selected:', item._id, item.fullName);
                    setSelectedEmployee(item._id);
                    setSelectedEmployeeName(item.fullName);
                    setShowEmployeeModal(false);
                  }}
                  activeOpacity={0.6}
                  style={[
                    styles.employeeOption,
                    { borderBottomColor: colors.border },
                  ]}
                >
                  <View>
                    <Text style={{ fontWeight: '600', color: colors.text }}>
                      {item.fullName}
                    </Text>
                    <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 4 }}>
                      {item.email}
                    </Text>
                  </View>
                  {selectedEmployee === item._id && (
                    <Ionicons name="checkmark-circle" size={24} color={colors.primary} />
                  )}
                </TouchableOpacity>
              )}
              ListEmptyComponent={
                <Text style={{ color: colors.textSecondary, textAlign: 'center', padding: spacing.lg }}>
                  No employees found
                </Text>
              }
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  templateCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  templateCardSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
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
    marginTop: '20%',
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    padding: spacing.lg,
  },
  employeeOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
  },
});