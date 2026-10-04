import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, TouchableOpacity, ActivityIndicator, SafeAreaView, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function AIQuestionReviewScreen() {
  const auth = useContext(AuthContext);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  
  if (!auth?.user?.companyId) return null;

  const reviews = useQuery(api.policyManagement?.getPendingAIReviews || null,
    auth.user.companyId ? { companyId: auth.user.companyId as any } : "skip"
  ) || [];

  const approveQuestion = useMutation(api.policyManagement?.approveAIQuestion || null);
  const rejectQuestion = useMutation(api.policyManagement?.rejectAIQuestion || null);

  const handleApprove = async (reviewId: string) => {
    if (!approveQuestion) return;
    try {
      await approveQuestion({
        reviewId: reviewId as any,
        companyId: auth.user.companyId as any,
        userId: auth.user.userId as any,
        notes: 'Approved by HR',
      });
      Alert.alert('Success', 'Question approved');
      setSelectedReviewId(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to approve question');
    }
  };

  const handleReject = async (reviewId: string) => {
    if (!rejectQuestion) return;
    try {
      await rejectQuestion({
        reviewId: reviewId as any,
        companyId: auth.user.companyId as any,
        userId: auth.user.userId as any,
        rejectionReason: 'Does not align with company policy',
      });
      Alert.alert('Success', 'Question rejected');
      setSelectedReviewId(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to reject question');
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView style={styles.container}>
        <View style={styles.header}>
          <Text style={typography.h2}>AI Question Review</Text>
          <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm }}>
            Review and validate AI-generated training questions
          </Text>
        </View>

        {reviews.length === 0 ? (
          <View style={styles.emptyState}>
            <MaterialIcons name="check-circle" size={48} color={colors.success} />
            <Text style={{ ...typography.h4, color: colors.text, marginTop: spacing.lg }}>
              All caught up!
            </Text>
            <Text style={{ ...typography.body, color: colors.textSecondary, marginTop: spacing.sm, textAlign: 'center' }}>
              No AI questions pending review
            </Text>
          </View>
        ) : (
          <View>
            {reviews.map((review: any, idx: number) => (
              <View key={review._id} style={styles.reviewCard}>
                <View style={styles.reviewHeader}>
                  <View style={styles.badge}>
                    <Text style={{ ...typography.small, color: colors.background }}>
                      #{idx + 1}
                    </Text>
                  </View>
                  <Text style={{ ...typography.body, color: colors.textSecondary, marginLeft: spacing.sm }}>
                    Flagged for: {review.reason}
                  </Text>
                </View>

                <View style={styles.reviewActions}>
                  <TouchableOpacity 
                    style={[styles.actionButton, styles.approveButton]}
                    onPress={() => handleApprove(review._id)}
                  >
                    <MaterialIcons name="check" size={20} color={colors.background} />
                    <Text style={{ ...typography.small, color: colors.background, marginLeft: spacing.xs }}>
                      Approve
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={[styles.actionButton, styles.rejectButton]}
                    onPress={() => handleReject(review._id)}
                  >
                    <MaterialIcons name="close" size={20} color={colors.error} />
                    <Text style={{ ...typography.small, color: colors.error, marginLeft: spacing.xs }}>
                      Reject
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={typography.h4}>How It Works</Text>
          <View style={styles.infoBox}>
            <View style={styles.infoItem}>
              <Text style={{ ...typography.body, fontWeight: '600' }}>🤖 AI Generates</Text>
              <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.xs }}>
                AI creates training questions from your policy documents
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={{ ...typography.body, fontWeight: '600' }}>🚩 Flagged Review</Text>
              <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.xs }}>
                Questions are flagged automatically if confidence is below threshold
              </Text>
            </View>
            <View style={styles.infoItem}>
              <Text style={{ ...typography.body, fontWeight: '600' }}>✅ HR Validates</Text>
              <Text style={{ ...typography.small, color: colors.textSecondary, marginTop: spacing.xs }}>
                You review and approve before employees see them
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.lg,
  },
  header: {
    marginBottom: spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: spacing.xxl,
  },
  reviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.warning,
  },
  reviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  badge: {
    backgroundColor: colors.warning,
    width: 32,
    height: 32,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: colors.success,
  },
  rejectButton: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.error,
  },
  section: {
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  infoBox: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  infoItem: {
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
});
