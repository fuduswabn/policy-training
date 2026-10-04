import React from 'react';
import { StyleSheet, View, Text, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors, spacing, radius, typography } from '../lib/theme';

interface DailyLearningProps {
  dayNumber: number;
  lessonTitle: string;
  estimatedMinutes: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'missed';
  onStartPress: () => void;
  onContinuePress: () => void;
  module?: string;
}

export default function DailyLearningCard({
  dayNumber,
  lessonTitle,
  estimatedMinutes,
  status,
  onStartPress,
  onContinuePress,
  module,
}: DailyLearningProps) {
  const isCompleted = status === 'completed';
  const isInProgress = status === 'in_progress';

  const getStatusColor = () => {
    if (isCompleted) return colors.success;
    if (isInProgress) return colors.warning;
    return colors.primary;
  };

  const getStatusIcon = () => {
    if (isCompleted) return 'check-circle';
    if (isInProgress) return 'schedule';
    return 'play-circle';
  };

  return (
    <View style={[styles.card, { borderLeftColor: getStatusColor(), borderLeftWidth: 4 }]}>
      <View style={styles.header}>
        <View>
          <Text style={styles.dayLabel}>Day {dayNumber}</Text>
          {module && <Text style={styles.moduleLabel}>{module}</Text>}
        </View>
        <MaterialIcons
          name={getStatusIcon()}
          size={28}
          color={getStatusColor()}
        />
      </View>

      <Text style={styles.lessonTitle}>{lessonTitle}</Text>

      <View style={styles.footer}>
        <View style={styles.timeEstimate}>
          <MaterialIcons name="schedule" size={16} color={colors.textSecondary} />
          <Text style={styles.timeText}>{estimatedMinutes} min</Text>
        </View>

        {!isCompleted && (
          <TouchableOpacity
            style={[styles.button, isInProgress && styles.continueButton]}
            onPress={isInProgress ? onContinuePress : onStartPress}
          >
            <Text style={styles.buttonText}>
              {isInProgress ? 'Continue' : 'Start Today'}
            </Text>
            <MaterialIcons
              name={isInProgress ? 'play-arrow' : 'arrow-forward'}
              size={18}
              color="white"
              style={{ marginLeft: spacing.xs }}
            />
          </TouchableOpacity>
        )}

        {isCompleted && (
          <View style={styles.completedBadge}>
            <MaterialIcons name="check" size={16} color={colors.success} />
            <Text style={styles.completedText}>Completed</Text>
          </View>
        )}
      </View>
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
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  dayLabel: {
    ...typography.title,
    color: colors.text,
    marginBottom: spacing.xs,
  },
  moduleLabel: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  lessonTitle: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '600',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  timeEstimate: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  timeText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  button: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: colors.warning,
  },
  buttonText: {
    color: 'white',
    ...typography.labelMedium,
    fontWeight: '600',
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: `${colors.success}15`,
    borderRadius: radius.md,
  },
  completedText: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
  },
});
