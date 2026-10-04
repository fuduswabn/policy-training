import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, View, ScrollView, TouchableOpacity, Text, Image, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import { api } from '../lib/config';

const PhotoComparisonScreen = ({ route, navigation }: any) => {
  const { assetId, baselinePhotoUrl, currentPhotoUrl, assetName, assetType } = route.params;
  const [selectedComparison, setSelectedComparison] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);
  const [verificationNotes, setVerificationNotes] = useState('');

  const comparisons = useQuery(api.inspections.getComparisons, { assetId });
  const analyzePhotos = useMutation(api.inspections.analyzePhotos);
  const updateComparison = useMutation(api.inspections.updateComparisonWithAnalysis);
  const verifyComparison = useMutation(api.inspections.verifyComparison);

  const performAnalysis = useCallback(async () => {
    if (!baselinePhotoUrl || !currentPhotoUrl || hasAnalyzed) return;
    try {
      setIsAnalyzing(true);
      const analysis = await analyzePhotos({
        baselinePhotoUrl,
        currentPhotoUrl,
        assetType: assetType || 'unknown',
        assetName: assetName || 'Asset',
      });
      console.log('Analysis results:', analysis);
      setHasAnalyzed(true);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  }, [baselinePhotoUrl, currentPhotoUrl, assetType, assetName, analyzePhotos, hasAnalyzed]);

  useEffect(() => {
    performAnalysis();
  }, [performAnalysis]);

  const handleVerification = async (verified: boolean) => {
    if (!selectedComparison) return;
    try {
      // This would be called with actual user ID from auth context
      await verifyComparison({
        comparisonId: selectedComparison._id,
        verified,
        verifiedBy: 'userId-placeholder', // Replace with actual user ID
        verificationNotes: verified ? verificationNotes : undefined,
      });
      setSelectedComparison(null);
      setVerificationNotes('');
    } catch (error) {
      console.error('Verification failed:', error);
    }
  };

  if (!comparisons) {
    return (
      <SafeAreaView style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </TouchableOpacity>
        <Text style={typography.h2}>Photo Comparison</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {isAnalyzing && (
          <View style={styles.analyzingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[typography.body, { marginTop: spacing.md, textAlign: 'center' }]}>
              AI is analyzing photos...
            </Text>
          </View>
        )}

        {comparisons.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="image-not-supported" size={48} color={colors.textTertiary} />
            <Text style={[typography.body, { color: colors.textSecondary, marginTop: spacing.md }]}>
              No comparisons available
            </Text>
          </View>
        ) : (
          comparisons.map((comparison: any) => (
            <TouchableOpacity
              key={comparison._id}
              style={styles.comparisonCard}
              onPress={() => setSelectedComparison(comparison)}
            >
              <View style={styles.comparisonHeader}>
                <View>
                  <Text style={typography.bodyMedium}>Inspection Comparison</Text>
                  <Text style={[typography.small, { color: colors.textSecondary, marginTop: spacing.xs }]}>
                    {new Date(comparison.createdAt).toLocaleDateString()}
                  </Text>
                </View>
                <View
                  style={[
                    styles.statusBadge,
                    comparison.analysisStatus === 'completed' && styles.statusCompleted,
                    comparison.analysisStatus === 'pending_review' && styles.statusPending,
                    comparison.analysisStatus === 'analyzing' && styles.statusAnalyzing,
                    comparison.analysisStatus === 'verified' && styles.statusVerified,
                  ]}
                >
                  <Text style={[typography.small, { color: colors.background }]}>
                    {comparison.analysisStatus.toUpperCase()}
                  </Text>
                </View>
              </View>

              {comparison.aiAnalysis && (
                <View style={styles.analysisContainer}>
                  {comparison.aiAnalysis.damageFlagged && (
                    <View style={styles.findingRow}>
                      <MaterialIcons name="warning" size={20} color={colors.warning} />
                      <Text style={[typography.small, { flex: 1, marginLeft: spacing.sm }]}>
                        <Text style={{ fontWeight: '600' }}>Damage Detected</Text>
                      </Text>
                    </View>
                  )}

                  {comparison.aiAnalysis.visibleChanges.length > 0 && (
                    <View style={styles.findingRow}>
                      <MaterialIcons name="changes" size={20} color={colors.accent} />
                      <Text style={[typography.small, { flex: 1, marginLeft: spacing.sm }]}>
                        <Text style={{ fontWeight: '600' }}>Changes:</Text> {comparison.aiAnalysis.visibleChanges.join(', ')}
                      </Text>
                    </View>
                  )}

                  {comparison.aiAnalysis.missingComponents.length > 0 && (
                    <View style={styles.findingRow}>
                      <MaterialIcons name="error" size={20} color={colors.error} />
                      <Text style={[typography.small, { flex: 1, marginLeft: spacing.sm }]}>
                        <Text style={{ fontWeight: '600' }}>Missing:</Text> {comparison.aiAnalysis.missingComponents.join(', ')}
                      </Text>
                    </View>
                  )}

                  <View style={styles.conditionBadge}>
                    <Text style={typography.small}>
                      Condition: {comparison.aiAnalysis.conditionAssessment}
                    </Text>
                    <Text style={[typography.small, { marginTop: spacing.xs }]}>
                      Confidence: {comparison.aiAnalysis.confidence}%
                    </Text>
                  </View>

                  {comparison.aiAnalysis.requiresHumanReview && (
                    <View style={[styles.conditionBadge, { backgroundColor: colors.warning }]}>
                      <Text style={[typography.small, { color: colors.background }]}>
                        ⚠️ Requires Human Review
                      </Text>
                    </View>
                  )}
                </View>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {selectedComparison && (
        <View style={styles.detailsPanel}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedComparison(null)}
          >
            <MaterialIcons name="close" size={24} color={colors.primary} />
          </TouchableOpacity>

          <Text style={typography.h3}>AI Analysis Results</Text>

          {selectedComparison.aiAnalysis && (
            <ScrollView style={styles.detailsScroll} showsVerticalScrollIndicator={false}>
              <View style={styles.detailSection}>
                <Text style={[typography.bodyMedium, { marginBottom: spacing.sm }]}>
                  Findings
                </Text>
                <Text style={typography.body}>{selectedComparison.aiAnalysis.findings}</Text>
              </View>

              <View style={styles.detailSection}>
                <Text style={[typography.bodyMedium, { marginBottom: spacing.sm }]}>
                  Confidence Score
                </Text>
                <View style={styles.confidenceBar}>
                  <View
                    style={[
                      styles.confidenceFill,
                      {
                        width: `${selectedComparison.aiAnalysis.confidence}%`,
                        backgroundColor: selectedComparison.aiAnalysis.confidence > 70 ? colors.success : colors.warning,
                      },
                    ]}
                  />
                </View>
                <Text style={[typography.small, { marginTop: spacing.sm }]}>
                  {selectedComparison.aiAnalysis.confidence}%
                </Text>
              </View>

              {selectedComparison.analysisStatus === 'pending_review' && (
                <View style={styles.detailSection}>
                  <Text style={[typography.bodyMedium, { marginBottom: spacing.sm }]}>
                    Verification
                  </Text>
                  <View style={styles.verificationButtons}>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonApprove]}
                      onPress={() => handleVerification(true)}
                    >
                      <Text style={[typography.bodyMedium, { color: colors.background }]}>
                        Approve
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.button, styles.buttonReject]}
                      onPress={() => handleVerification(false)}
                    >
                      <Text style={[typography.bodyMedium, { color: colors.background }]}>
                        Request Review
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            </ScrollView>
          )}
        </View>
      )}
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
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  analyzingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
  },
  comparisonCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
  },
  comparisonHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  statusBadge: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.full,
    backgroundColor: colors.textTertiary,
  },
  statusCompleted: {
    backgroundColor: colors.success,
  },
  statusPending: {
    backgroundColor: colors.warning,
  },
  statusAnalyzing: {
    backgroundColor: colors.primary,
  },
  statusVerified: {
    backgroundColor: colors.success,
  },
  analysisContainer: {
    gap: spacing.md,
    marginTop: spacing.md,
  },
  findingRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.surfaceDark,
    padding: spacing.md,
    borderRadius: radius.md,
  },
  conditionBadge: {
    backgroundColor: colors.surfaceDark,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
  },
  detailsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.background,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxHeight: '70%',
    zIndex: 100,
  },
  closeButton: {
    alignSelf: 'flex-end',
    marginBottom: spacing.md,
  },
  detailsScroll: {
    marginTop: spacing.md,
  },
  detailSection: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  confidenceBar: {
    height: 8,
    borderRadius: radius.full,
    backgroundColor: colors.surfaceDark,
    overflow: 'hidden',
  },
  confidenceFill: {
    height: '100%',
  },
  verificationButtons: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  button: {
    flex: 1,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  buttonApprove: {
    backgroundColor: colors.success,
  },
  buttonReject: {
    backgroundColor: colors.error,
  },
});

export default PhotoComparisonScreen;