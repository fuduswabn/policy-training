import React, { useContext } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function LearningPlanScreen({ route, navigation }: any) {
  const { user } = useContext(AuthContext);
  const { learningRequestId } = route.params;
  const learningPlan = useQuery(api.aiLearningPlanner.getLearningPlan, { learningRequestId });

  if (!learningPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const allLessons = learningPlan.modules.flatMap((module: any) => module.lessons);
  const firstLesson = allLessons[0];

  const formatMinutes = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={typography.h2}>Learning Plan</Text>
          <View style={{ width: 24 }} />
        </View>

        {/* Course Title */}
        <View style={styles.heroSection}>
          <MaterialIcons name="school" size={48} color={colors.primary} />
          <Text style={styles.courseTitle}>{learningPlan.request.skill}</Text>
          <Text style={styles.courseGoal}>{learningPlan.request.learningGoal}</Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.statsContainer}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Total Duration</Text>
            <Text style={styles.statValue}>{formatMinutes(learningPlan.totalEstimatedMinutes)}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Modules</Text>
            <Text style={styles.statValue}>{learningPlan.modules.length}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Lessons</Text>
            <Text style={styles.statValue}>
              {learningPlan.modules.reduce((sum: number, m: any) => sum + m.lessons.length, 0)}
            </Text>
          </View>
        </View>

        {/* Modules */}
        <View style={styles.modulesSection}>
          <Text style={styles.sectionTitle}>Learning Modules</Text>

          {learningPlan.modules.map((module: any, moduleIdx: number) => (
            <View key={module._id} style={styles.moduleCard}>
              {/* Module Header */}
              <View style={styles.moduleHeader}>
                <View style={styles.moduleBadge}>
                  <Text style={styles.moduleBadgeText}>{module.order}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.moduleTitle}>{module.title}</Text>
                  {module.description && (
                    <Text style={styles.moduleDescription}>{module.description}</Text>
                  )}
                </View>
                <Text style={styles.moduleDuration}>{formatMinutes(module.estimatedDurationMinutes)}</Text>
              </View>

              {/* Objectives */}
              {module.objectives.length > 0 && (
                <View style={styles.objectivesSection}>
                  <Text style={styles.objectivesTitle}>What you'll learn:</Text>
                  {module.objectives.map((obj: string, idx: number) => (
                    <View key={idx} style={styles.objectiveItem}>
                      <MaterialIcons name="check-circle" size={16} color={colors.primary} />
                      <Text style={styles.objectiveText}>{obj}</Text>
                    </View>
                  ))}
                </View>
              )}

              {/* Lessons */}
              <View style={styles.lessonsSection}>
                <Text style={styles.lessonsTitle}>Lessons</Text>
                {module.lessons.map((lesson: any, lessonIdx: number) => (
                  <View key={lesson._id} style={styles.lessonItem}>
                    <View style={styles.lessonBadge}>
                      <Text style={styles.lessonBadgeText}>{lesson.order}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.lessonTitle}>{lesson.title}</Text>
                      {lesson.description && (
                        <Text style={styles.lessonDescription}>{lesson.description}</Text>
                      )}
                      {lesson.keyPoints.length > 0 && (
                        <View style={styles.keyPointsContainer}>
                          {lesson.keyPoints.map((point: string, idx: number) => (
                            <Text key={idx} style={styles.keyPoint}>• {point}</Text>
                          ))}
                        </View>
                      )}
                    </View>
                    <Text style={styles.lessonDuration}>{formatMinutes(lesson.estimatedDurationMinutes)}</Text>
                  </View>
                ))}
              </View>
            </View>
          ))}
        </View>

        {/* Start Button */}
        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            if (!firstLesson) {
              Alert.alert('No lessons found', 'This learning plan does not have any lessons yet.');
              return;
            }
            navigation.navigate('LessonReader', {
              learningRequestId,
              lessonId: firstLesson._id,
              lessonIds: allLessons.map((lesson: any) => lesson._id),
              lessonNumber: 1,
              totalLessons: allLessons.length,
              userId: user?.userId,
            });
          }}
        >
          <MaterialIcons name="play-arrow" size={20} color={colors.background} />
          <Text style={styles.startButtonText}>Start Learning</Text>
        </TouchableOpacity>

        <View style={{ height: spacing.xl }} />
      </ScrollView>
    </SafeAreaView>
  );
}

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
    paddingVertical: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  heroSection: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.primary + '10',
  },
  courseTitle: {
    ...typography.h1,
    color: colors.text,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  courseGoal: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  statBox: {
    flex: 1,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  statLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  statValue: {
    ...typography.h3,
    color: colors.primary,
    fontWeight: '600',
  },
  modulesSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  moduleCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: spacing.lg,
    overflow: 'hidden',
  },
  moduleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  moduleBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  moduleBadgeText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '600',
  },
  moduleTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  moduleDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  moduleDuration: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.md,
  },
  objectivesSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  objectivesTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  objectiveItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.xs,
  },
  objectiveText: {
    ...typography.caption,
    color: colors.text,
    marginLeft: spacing.sm,
    flex: 1,
  },
  lessonsSection: {
    padding: spacing.lg,
  },
  lessonsTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  lessonItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
    paddingBottom: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  lessonBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: spacing.xs,
  },
  lessonBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12,
  },
  lessonTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
  },
  lessonDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  keyPointsContainer: {
    marginTop: spacing.sm,
  },
  keyPoint: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  lessonDuration: {
    ...typography.caption,
    color: colors.textSecondary,
    marginLeft: spacing.md,
    marginTop: spacing.xs,
  },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.md,
  },
  startButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});