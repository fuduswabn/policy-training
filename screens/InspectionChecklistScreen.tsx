import React, { useState, useEffect, useContext } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Alert, TextInput } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useAction, useMutation, useQuery } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import * as ImagePicker from 'expo-image-picker';

interface ChecklistItem {
  id: string;
  item: string;
  status: 'pass' | 'fail' | 'na' | null;
  comment: string;
  photoUris: string[];
}

type TemplateChecklistItem = {
  id?: string;
  item: string;
};

const InspectionChecklistScreen = ({ route, navigation }: any) => {
  const { templateId, assetType, vehicleId, assetId } = route.params;
  const { user } = useContext(AuthContext);
  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [overallComment, setOverallComment] = useState('');
  const [isBaseline, setIsBaseline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [comparisonResults, setComparisonResults] = useState<Record<string, any>>({});

  const templates = useQuery(
    api.inspections.getTemplates,
    user?.companyId ? { companyId: user.companyId as any } : 'skip'
  );

  const checklistItemIds = checklist.map((item: ChecklistItem) => item.id);
  const baselinePhotos = useQuery(
    api.inspections.getInspectionItemBaselines,
    user?.companyId && templateId && checklistItemIds.length > 0
      ? {
          companyId: user.companyId as any,
          templateId: templateId as any,
          checklistItemIds,
        }
      : 'skip'
  );

  const createInspection = useMutation(api.inspections.createInspection);
  const updateInspectionResults = useMutation(api.inspections.updateInspectionResults);
  const generateInspectionPhotoUploadUrl = useMutation(api.inspections.generateInspectionPhotoUploadUrl);
  const saveInspectionPhoto = useMutation(api.inspections.saveInspectionPhoto);
  const compareInspectionPhotos = useAction(api.inspections.compareInspectionPhotos);
  const analyzeChecklistItem = useAction(api.inspections.analyzeChecklistItem);

  useEffect(() => {
    const template = templates?.find((t: any) => String(t._id) === String(templateId));
    if (!template?.checklist?.length) {
      return;
    }

    setChecklist((prev: ChecklistItem[]) => {
      if (prev.length > 0) {
        return prev;
      }

      const checklistItems: ChecklistItem[] = (template.checklist as TemplateChecklistItem[]).map(
        (item: TemplateChecklistItem, index: number): ChecklistItem => ({
          id: item.id || String(index),
          item: item.item,
          status: null,
          comment: '',
          photoUris: [],
        })
      );

      return checklistItems;
    });
  }, [templateId, templates]);

  const updateChecklistItem = (itemId: string, field: string, value: any) => {
    setChecklist((prev: ChecklistItem[]) =>
      prev.map((item: ChecklistItem) =>
        item.id === itemId ? { ...item, [field]: value } : item
      )
    );
  };

  const addPhoto = async (itemId: string) => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled) {
        const photoUri = result.assets[0].uri;
        setChecklist((prev: ChecklistItem[]) =>
          prev.map((item: ChecklistItem) =>
            item.id === itemId ? { ...item, photoUris: [...item.photoUris, photoUri] } : item
          )
        );
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to capture photo');
    }
  };

  const removePhoto = (itemId: string, photoIndex: number) => {
    setChecklist((prev: ChecklistItem[]) =>
      prev.map((item: ChecklistItem) =>
        item.id === itemId
          ? { ...item, photoUris: item.photoUris.filter((_, index) => index !== photoIndex) }
          : item
      )
    );
  };

  const uploadPhoto = async (photoUri: string) => {
    const uploadUrl = await generateInspectionPhotoUploadUrl({});
    const response = await globalThis.fetch(photoUri);
    const blob = await response.blob();
    const uploadResponse = await globalThis.fetch(uploadUrl, {
      method: 'POST',
      headers: {
        'Content-Type': blob.type || 'image/jpeg',
      },
      body: blob,
    });

    if (!uploadResponse.ok) {
      throw new Error('Failed to upload photo');
    }

    return await uploadResponse.json();
  };

  const getAssetName = () => {
    if (assetType === 'vehicle') return 'Vehicle inspection';
    if (assetType === 'asset') return 'Equipment inspection';
    return 'General inspection';
  };

  const handleSubmitInspection = async () => {
    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);

      const inspectionId = await createInspection({
        companyId: user?.companyId as any,
        templateId: templateId as any,
        inspectorId: user?.userId as any,
        assetType,
        vehicleId,
        assetId,
        checklist: checklist.map((item: ChecklistItem) => ({
          itemId: item.id,
          item: item.item,
          status: item.status || 'na',
          comment: item.comment || undefined,
        })),
        overallCondition: 'pass',
        comments: overallComment,
        isBaseline: !baselinePhotos || baselinePhotos.length === 0,
        followUpActionRequired: false,
        followUpNotes: overallComment || undefined,
      });

      const nextComparisonResults: Record<string, any> = {};
      const aiChecklist = [] as Array<{ itemId: string; item: string; status: 'pass' | 'fail' | 'na'; comment?: string }>;

      for (const item of checklist) {
        const baseline = baselinePhotos?.find((photo: { checklistItemId: string }) => photo.checklistItemId === item.id);
        const savedPhotos = [] as Array<{ photoUrl: string }>;

        for (const [photoIndex, photoUri] of item.photoUris.entries()) {
          const { storageId } = await uploadPhoto(photoUri);
          const savedPhoto = await saveInspectionPhoto({
            inspectionId,
            companyId: user?.companyId as any,
            templateId: templateId as any,
            checklistItemId: item.id,
            itemName: item.item,
            assetType,
            storageId,
            isBaseline: !baseline,
            vehicleId,
            assetId,
            comment: item.comment || overallComment || undefined,
            caption: `${item.item} photo ${photoIndex + 1}`,
            angle: `photo_${photoIndex + 1}`,
            order: photoIndex,
          });
          savedPhotos.push(savedPhoto);
        }

        if (item.photoUris.length > 0 && savedPhotos.length !== item.photoUris.length) {
          throw new Error(`Some photos for ${item.item} were not saved`);
        }

        const currentPhotoUrls = savedPhotos.map((photo) => photo.photoUrl);
        const aiAnalysis = await analyzeChecklistItem({
          itemName: item.item,
          assetType,
          assetName: getAssetName(),
          comment: item.comment || overallComment || undefined,
          photoUrls: currentPhotoUrls,
        });

        const finalStatus = aiAnalysis.recommendedStatus;
        const aiSummary = `${aiAnalysis.summary}${aiAnalysis.recommendation ? ` Recommendation: ${aiAnalysis.recommendation}` : ''}${aiAnalysis.requiresHumanReview ? ' Manager review recommended.' : ''}`;

        aiChecklist.push({
          itemId: item.id,
          item: item.item,
          status: finalStatus,
          comment: item.comment || aiSummary || undefined,
        });

        if (currentPhotoUrls.length === 0) {
          nextComparisonResults[item.id] = {
            issuesDetected: finalStatus === 'fail',
            comparisonSummary: aiSummary || 'No photo added for AI comparison.',
            changesFromPrevious: [],
            aiRecommendation: aiAnalysis.recommendation || (aiAnalysis.requiresHumanReview ? 'Review manually' : `AI suggested ${finalStatus}`),
            confidenceLevel: aiAnalysis.confidence,
            requiresApproval: aiAnalysis.requiresHumanReview,
          };
          continue;
        }

        if (baseline) {
          const comparison = await compareInspectionPhotos({
            currentPhotoUrls,
            previousPhotoUrls: baseline.photoUrls || [baseline.photoUrl],
            checklistItemName: item.item,
            assetName: getAssetName(),
          });
          nextComparisonResults[item.id] = comparison;
        } else {
          nextComparisonResults[item.id] = {
            issuesDetected: finalStatus === 'fail',
            comparisonSummary: `${aiSummary || 'Saved as baseline photos for future comparisons.'} ${currentPhotoUrls.length} photo${currentPhotoUrls.length === 1 ? '' : 's'} saved.`,
            changesFromPrevious: [],
            aiRecommendation: aiAnalysis.recommendation || (aiAnalysis.requiresHumanReview ? 'Review manually' : `AI suggested ${finalStatus}`),
            confidenceLevel: aiAnalysis.confidence,
            requiresApproval: aiAnalysis.requiresHumanReview,
          };
        }
      }

      const failedItems = aiChecklist.filter((item) => item.status === 'fail');
      const reviewItems = Object.entries(nextComparisonResults)
        .filter(([, result]: [string, any]) => result.requiresApproval)
        .map(([itemId]) => checklist.find((item: ChecklistItem) => item.id === itemId)?.item)
        .filter(Boolean);
      const followUpNotes = failedItems.length > 0 || reviewItems.length > 0
        ? `AI follow-up required. Failed item(s): ${failedItems.map((item) => item.item).join(', ') || 'none'}. Manager review item(s): ${reviewItems.join(', ') || 'none'}.${overallComment ? ` ${overallComment}` : ''}`
        : undefined;

      await updateInspectionResults({
        inspectionId,
        checklist: aiChecklist,
        overallCondition: failedItems.length > 0 ? 'fail' : 'pass',
        comments: overallComment || undefined,
        followUpActionRequired: failedItems.length > 0 || reviewItems.length > 0,
        followUpNotes,
      });

      setComparisonResults(nextComparisonResults);
      Alert.alert('Success', 'AI inspection completed and submitted');
      navigation.goBack();
    } catch (error: any) {
      Alert.alert('Error', error?.message || 'Failed to submit inspection');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection Checklist</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={typography.h4}>AI Inspection</Text>
          <View style={styles.autoFollowUpBox}>
            <MaterialIcons name="auto-awesome" size={22} color={colors.primary} />
            <Text style={styles.autoFollowUpText}>
              Take as many clear angles as needed for each item. The AI will compare all submitted photos against the baseline photos, decide Pass, Fail, or N/A, and create follow-up when needed.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={typography.h4}>Inspection Items</Text>
          {checklist.map((item: ChecklistItem) => (
            <View key={item.id} style={styles.checklistItemContainer}>
              <Text style={[typography.body, { marginBottom: spacing.sm }]}>{item.item}</Text>

              <View style={styles.aiDecisionPlaceholder}>
                <MaterialIcons name="psychology" size={18} color={colors.primary} />
                <Text style={styles.aiDecisionText}>AI will review all angles you add and compare them with the baseline photos.</Text>
              </View>

              <TouchableOpacity
                style={styles.photoButton}
                onPress={() => addPhoto(item.id)}
              >
                <MaterialIcons name="camera-alt" size={20} color={colors.primary} />
                <Text style={[typography.small, { color: colors.primary }]}>
                  Add Another Angle{item.photoUris.length > 0 ? ` (${item.photoUris.length})` : ''}
                </Text>
              </TouchableOpacity>

              {item.photoUris.length > 0 && (
                <View style={styles.photoList}>
                  {item.photoUris.map((_, photoIndex) => (
                    <View key={`${item.id}-${photoIndex}`} style={styles.photoChip}>
                      <MaterialIcons name="photo" size={16} color={colors.success} />
                      <Text style={styles.photoChipText}>Photo {photoIndex + 1}</Text>
                      <TouchableOpacity onPress={() => removePhoto(item.id, photoIndex)}>
                        <MaterialIcons name="close" size={16} color={colors.textSecondary} />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}

              {comparisonResults[item.id] && (
                <View style={styles.comparisonBox}>
                  <Text style={styles.comparisonTitle}>AI Comparison</Text>
                  <Text style={styles.comparisonText}>
                    {comparisonResults[item.id].comparisonSummary}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={typography.bodyMedium}>Optional Notes</Text>
          <TextInput
            style={[styles.input, { minHeight: 100, textAlignVertical: 'top' }]}
            placeholder="Add any context for the AI, if needed"
            placeholderTextColor={colors.textSecondary}
            value={overallComment}
            onChangeText={setOverallComment}
            multiline
          />
        </View>

        <View style={styles.section}>
          <View style={styles.autoFollowUpBox}>
            <MaterialIcons name="assignment-late" size={22} color={colors.warning} />
            <Text style={styles.autoFollowUpText}>
              If the AI finds a defect or unclear evidence, it will flag manager review and recommend follow-up actions automatically.
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
          onPress={handleSubmitInspection}
          disabled={isSubmitting}
        >
          <MaterialIcons name="check" size={24} color={colors.background} />
          <Text style={[typography.body, { color: colors.background, fontWeight: '600' }]}> 
            {isSubmitting ? 'AI is analysing...' : 'Submit for AI Inspection'}
          </Text>
        </TouchableOpacity>
      </ScrollView>
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
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: colors.primary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  checklistItemContainer: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.md,
  },
  aiDecisionPlaceholder: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceDark,
    marginVertical: spacing.md,
  },
  aiDecisionText: {
    ...typography.small,
    color: colors.text,
    flex: 1,
  },
  photoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  photoList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  photoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceDark,
  },
  photoChipText: {
    ...typography.small,
    color: colors.text,
  },
  comparisonBox: {
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceDark,
  },
  comparisonTitle: {
    ...typography.bodyMedium,
    color: colors.primary,
    marginBottom: spacing.xs,
  },
  comparisonText: {
    ...typography.body,
    color: colors.text,
  },
  toggle: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    marginTop: spacing.sm,
  },
  toggleActive: {
    backgroundColor: colors.surfaceDark,
  },
  autoFollowUpBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  autoFollowUpText: {
    ...typography.bodyMedium,
    color: colors.text,
    flex: 1,
  },
  input: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginTop: spacing.sm,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: colors.success,
    marginVertical: spacing.lg,
  },
  submitButtonDisabled: {
    backgroundColor: colors.textTertiary,
  },
});

export default InspectionChecklistScreen;