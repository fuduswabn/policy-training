import React, { useState, useContext } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Modal, Alert, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

interface ChecklistItem {
  id: string;
  item: string;
  required: boolean;
  requiresComment: boolean;
  requiresPhoto: boolean;
}

interface Template {
  _id: string;
  name: string;
  category: string;
  description?: string;
  checklist: ChecklistItem[];
  isActive: boolean;
  createdAt: number;
}

const InspectionTemplatesScreen = ({ navigation }: any) => {
  const { user } = useContext(AuthContext);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('vehicle');
  const [templateName, setTemplateName] = useState('');
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [newItem, setNewItem] = useState('');
  const [inspectionFrequency, setInspectionFrequency] = useState<'daily' | 'weekly' | 'monthly' | 'before_use'>('daily');

  // Fetch templates for the company
  const templates = useQuery(api.inspections.getTemplates, 
    user?.companyId ? { companyId: user.companyId } : 'skip'
  ) as Template[] | undefined;

  const categories = [
    { id: 'vehicle', label: 'Vehicle Inspection' },
    { id: 'equipment', label: 'Equipment Inspection' },
    { id: 'tools', label: 'Tools Inspection' },
    { id: 'workplace', label: 'Workplace Inspection' },
    { id: 'ppe', label: 'PPE Inspection' },
    { id: 'safety', label: 'Safety Inspection' },
    { id: 'site', label: 'Site Inspection' },
    { id: 'home_equipment', label: 'Home/Work Equipment' },
  ];

  const createTemplate = useMutation(api.inspections.createTemplate);

  const addChecklistItem = () => {
    if (newItem.trim()) {
      setChecklist([
        ...checklist,
        {
          id: Date.now().toString(),
          item: newItem,
          required: true,
          requiresComment: false,
          requiresPhoto: false,
        },
      ]);
      setNewItem('');
    }
  };

  const removeChecklistItem = (id: string) => {
    setChecklist(checklist.filter((item: ChecklistItem) => item.id !== id));
  };

  const handleCreateTemplate = async () => {
    if (!templateName.trim()) {
      Alert.alert('Error', 'Please enter a template name');
      return;
    }

    if (checklist.length === 0) {
      Alert.alert('Error', 'Please add at least one checklist item');
      return;
    }

    if (!user || !user.userId) {
      Alert.alert('Error', 'Your user ID is not available. Please log in again.');
      return;
    }

    if (!user.companyId) {
      Alert.alert('Error', 'Your company information is missing. Please log in again.');
      return;
    }

    try {
      await createTemplate({
        companyId: user.companyId,
        name: templateName,
        category: selectedCategory as any,
        checklist,
        userId: user.userId,
      });

      Alert.alert('Success', 'Template created successfully');
      setShowCreateModal(false);
      setTemplateName('');
      setChecklist([]);
    } catch (error: any) {
      console.error('Create template error:', error);
      Alert.alert('Error', error?.message || 'Failed to create template');
    }
  };

  // Add useEffect to handle back button when modal is open
  React.useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      if (showCreateModal) {
        e.preventDefault();
        setShowCreateModal(false);
      }
    });
    return unsubscribe;
  }, [navigation, showCreateModal]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={typography.h1}>Inspection Templates</Text>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => setShowCreateModal(true)}
        >
          <MaterialIcons name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        showsVerticalScrollIndicator={false}
      >
        <Text style={[typography.body, { color: colors.textSecondary, marginBottom: spacing.md }]}>
          Create and manage reusable inspection templates for different asset types.
        </Text>

        <View style={styles.categoryGrid}>
          {categories.map((cat) => (
            <TouchableOpacity key={cat.id} style={styles.categoryCard}>
              <MaterialIcons name="assignment-turned-in" size={32} color={colors.primary} />
              <Text style={typography.small}>{cat.label}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Display Created Templates */}
        {templates && templates.length > 0 && (
          <>
            <Text style={[typography.h3, { marginTop: spacing.lg, marginBottom: spacing.md }]}>
              Your Templates ({templates.length})
            </Text>
            <View style={styles.templatesList}>
              {templates.map((template: Template) => {
                const assetType = template.category === 'vehicle' ? 'vehicle' : 'asset';

                return (
                  <TouchableOpacity
                    key={template._id}
                    style={styles.templateCard}
                    activeOpacity={0.75}
                    onPress={() =>
                      navigation.navigate('InspectionChecklist', {
                        templateId: template._id,
                        assetType,
                      })
                    }
                  >
                    <View style={styles.templateHeader}>
                      <View style={styles.templateInfo}>
                        <Text style={typography.bodyMedium}>{template.name}</Text>
                        <Text style={[typography.small, { color: colors.textSecondary }]}>
                          {template.category} • {template.checklist.length} items
                        </Text>
                      </View>
                      <MaterialIcons name="chevron-right" size={24} color={colors.textSecondary} />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        )}

        {templates && templates.length === 0 && (
          <View style={styles.emptyState}>
            <MaterialIcons name="assignment" size={48} color={colors.textSecondary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              No templates yet. Click + to create your first template.
            </Text>
          </View>
        )}
      </ScrollView>

      <Modal
        visible={showCreateModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowCreateModal(false)}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateModal(false)}>
              <MaterialIcons name="close" size={24} color={colors.primary} />
            </TouchableOpacity>
            <Text style={typography.h2}>Create Template</Text>
            <TouchableOpacity onPress={handleCreateTemplate}>
              <MaterialIcons name="check" size={24} color={colors.primary} />
            </TouchableOpacity>
          </View>

          <ScrollView style={[styles.content, { paddingHorizontal: spacing.lg }]} showsVerticalScrollIndicator={false}>
            <Text style={typography.bodyMedium}>Template Name</Text>
            <TextInput
              style={styles.templateNameInput}
              placeholder="Enter template name"
              placeholderTextColor={colors.textSecondary}
              value={templateName}
              onChangeText={setTemplateName}
              editable={true}
              autoFocus={true}
            />

            <Text style={[typography.bodyMedium, { marginTop: spacing.lg }]}>Category</Text>
            <View style={styles.categorySelector}>
              {categories.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryOption,
                    selectedCategory === cat.id && styles.categoryOptionSelected,
                  ]}
                  onPress={() => setSelectedCategory(cat.id)}
                >
                  <Text style={typography.body}>{cat.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[typography.bodyMedium, { marginTop: spacing.lg }]}>Inspection Frequency</Text>
            <View style={styles.frequencySelector}>
              {[
                { value: 'daily', label: 'Daily' },
                { value: 'weekly', label: 'Weekly' },
                { value: 'monthly', label: 'Monthly' },
                { value: 'before_use', label: 'Before Use' },
              ].map((freq: any) => (
                <TouchableOpacity
                  key={freq.value}
                  style={[
                    styles.frequencyOption,
                    inspectionFrequency === freq.value && styles.frequencyOptionSelected,
                  ]}
                  onPress={() => setInspectionFrequency(freq.value)}
                >
                  <Text style={[typography.body, inspectionFrequency === freq.value && { color: colors.background }]}>
                    {freq.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[typography.bodyMedium, { marginTop: spacing.lg }]}>Checklist Items</Text>
            {checklist.map((item: ChecklistItem) => (
              <View key={item.id} style={styles.checklistItem}>
                <Text style={typography.body}>{item.item}</Text>
                <TouchableOpacity onPress={() => removeChecklistItem(item.id)}>
                  <MaterialIcons name="delete" size={20} color={colors.error} />
                </TouchableOpacity>
              </View>
            ))}

            <View style={styles.addItemContainer}>
              <TextInput
                style={[styles.input, styles.addItemInput, { color: colors.text }]}
                placeholder="Add checklist item"
                placeholderTextColor={colors.textSecondary}
                value={newItem}
                onChangeText={setNewItem}
                editable={true}
              />
              <TouchableOpacity style={styles.addBtn} onPress={addChecklistItem}>
                <MaterialIcons name="add" size={24} color={colors.background} />
              </TouchableOpacity>
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

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
  createBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  contentContainer: {
    paddingBottom: spacing.xxl * 3,
  },
  templateNameInput: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    color: colors.text,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  categoryCard: {
    width: '48%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    alignItems: 'center',
    gap: spacing.sm,
  },
  templatesList: {
    gap: spacing.sm,
  },
  templateCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  templateInfo: {
    flex: 1,
    gap: spacing.xs,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  input: {
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
    color: colors.text,
  },
  addItemInput: {
    flex: 1,
  },
  categorySelector: {
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  categoryOption: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
  },
  categoryOptionSelected: {
    backgroundColor: colors.primary,
  },
  frequencySelector: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  frequencyOption: {
    flex: 1,
    minWidth: '45%',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  frequencyOptionSelected: {
    backgroundColor: colors.primary,
  },
  checklistItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceDark,
    borderRadius: radius.md,
    marginTop: spacing.sm,
  },
  addItemContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  addBtn: {
    width: 44,
    height: 44,
    borderRadius: radius.md,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default InspectionTemplatesScreen;