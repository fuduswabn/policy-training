import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../lib/theme';

interface LearningProgressProps {
  percentageComplete: number;
  completedLessons: number;
  totalLessons: number;
  currentLessonTitle: string;
  nextLessonTitle?: string;
  status: 'active' | 'completed' | 'paused';
}

export default function LearningProgressCard({
  percentageComplete,
  completedLessons,
  totalLessons,
  currentLessonTitle,
  nextLessonTitle,
  status,
}: LearningProgressProps) {
  const isCompleted = status === 'completed';

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <Text style={styles.title}>
          {isCompleted ? 'Learning Completed!' : 'Continue Learning'}
        </Text>
        <MaterialIcons
          name={isCompleted ? 'check-circle' : 'school'}
          size={24}
          color={isCompleted ? colors.success : colors.primary}
        />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${percentageComplete}%`,
                backgroundColor: isCompleted ? colors.success : colors.primary,
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {percentageComplete}% Complete • {completedLessons}/{totalLessons} lessons
        </Text>
      </View>

      {!isCompleted && (
        <View style={styles.lessonsInfo}>
          <View style={styles.infoRow}>
            <MaterialIcons name="play-circle" size={18} color={colors.primary} />
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>Current Lesson</Text>
              <Text style={styles.infoValue}>{currentLessonTitle}</Text>
            </View>
          </View>

          {nextLessonTitle && (
            <View style={styles.infoRow}>
              <MaterialIcons name="arrow-forward" size={18} color={colors.textSecondary} />
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Next Lesson</Text>
                <Text style={styles.infoValue}>{nextLessonTitle}</Text>
              </View>
            </View>
          )}
        </View>
      )}

      {isCompleted && (
        <View style={styles.completedMessage}>
          <Text style={styles.completedText}>
            Congratulations! You have successfully completed all lessons.
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginVertical: spacing.md,
    marginHorizontal: spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  title: {
    ...typography.title,
    color: colors.text,
  },
  progressContainer: {
    marginBottom: spacing.lg,
  },
  progressBar: {
    height: 8,
    backgroundColor: colors.border,
    borderRadius: radius.full,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    borderRadius: radius.full,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  lessonsInfo: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
    padding: spacing.md,
    backgroundColor: `${colors.primary}08`,
    borderRadius: radius.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  infoValue: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  completedMessage: {
    padding: spacing.md,
    backgroundColor: `${colors.success}15`,
    borderRadius: radius.md,
    borderLeftWidth: 3,
    borderLeftColor: colors.success,
  },
  completedText: {
    ...typography.body,
    color: colors.success,
    fontWeight: '500',
  },
});
