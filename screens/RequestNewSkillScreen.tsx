import React, { useContext, useState } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, TouchableOpacity, TextInput, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

// AI Curriculum Generation
async function generateCurriculumWithAI(
  skill: string,
  experienceLevel: string,
  availableTime: string,
  learningGoal: string
): Promise<any> {
  const timePerDay: Record<string, number> = {
    "10_minutes": 10,
    "20_minutes": 20,
    "30_minutes": 30,
    "60_minutes": 60,
  };

  const dailyMinutes = timePerDay[availableTime] || 30;

  const experienceDescriptions: Record<string, string> = {
    beginner: "complete beginner with no prior knowledge",
    some_experience: "has some basic knowledge and experience",
    intermediate: "has intermediate knowledge and practical experience",
    advanced: "is already advanced and wants to deepen expertise",
  };

  const experienceDesc = experienceDescriptions[experienceLevel] || "intermediate";

  const prompt = `You are an expert curriculum designer. Create a structured learning plan for someone who wants to learn "${skill}".

Student Profile:
- Experience Level: ${experienceDesc}
- Available Time: ${dailyMinutes} minutes per day
- Learning Goal: ${learningGoal}

Generate a curriculum with the following structure:

1. Divide the learning into 4-6 modules
2. Each module should have 3-5 lessons
3. Total duration should be realistic for someone with ${dailyMinutes} minutes per day
4. Lessons must be practical and example-driven, not passive reading
5. Every lesson description must promise a concrete skill, decision, or mini-task the learner can use

Return ONLY valid JSON (no markdown, no code blocks) with this exact structure:
{
  "modules": [
    {
      "title": "Module title",
      "description": "Brief description",
      "estimatedDurationMinutes": 30,
      "objectives": ["Learning objective 1", "Learning objective 2"],
      "lessons": [
        {
          "title": "Lesson title",
          "description": "What will be covered",
          "estimatedDurationMinutes": 10,
          "keyPoints": ["Key point 1", "Key point 2", "Key point 3"]
        }
      ]
    }
  ]
}

Make the curriculum practical, progressive, and achievable. Adjust difficulty based on "${experienceDesc}". If a lesson is easy, keep it clear and useful. If it is hard, make it appropriately challenging and break it into usable steps. Avoid vague lessons that only define terms.`;

  try {
    const response = await fetch("https://api.a0.dev/ai/llm", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    if (!response.ok) {
      throw new Error(`LLM API error: ${response.statusText}`);
    }

    const data = await response.json();
    const completion = data.completion;

    // Parse the JSON response
    const curriculum = JSON.parse(completion);

    return curriculum;
  } catch (error) {
    console.error("Error generating curriculum:", error);
    throw new Error(
      "Failed to generate learning plan. Please try again later."
    );
  }
}

export default function RequestNewSkillScreen({ navigation }: any) {
  const { user } = useContext(AuthContext)!;
  const createRequest = useMutation(api.personalLearning.createLearningRequest);
  const saveLearningPlan = useMutation(api.aiLearningPlanner.saveLearningPlan);

  const [skill, setSkill] = useState('');
  const [reason, setReason] = useState('');
  const [experience, setExperience] = useState<'beginner' | 'some_experience' | 'intermediate' | 'advanced'>('beginner');
  const [time, setTime] = useState<'10_minutes' | '20_minutes' | '30_minutes' | '60_minutes'>('30_minutes');
  const [goal, setGoal] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    if (!skill.trim()) {
      Alert.alert('Error', 'Please enter the skill you want to learn');
      return;
    }
    if (!reason.trim()) {
      Alert.alert('Error', 'Please tell us why you want to learn this');
      return;
    }
    if (!goal.trim()) {
      Alert.alert('Error', 'Please set a learning goal');
      return;
    }

    try {
      setIsLoading(true);
      
      // Create the learning request
      const requestId = await createRequest({
        userId: user!.userId as any,
        skill: skill.trim(),
        reason: reason.trim(),
        experienceLevel: experience,
        availableTime: time,
        learningGoal: goal.trim(),
      });

      // Generate curriculum using AI
      const curriculum = await generateCurriculumWithAI(skill, experience, time, goal);
      
      // Save the learning plan
      await saveLearningPlan({
        learningRequestId: requestId,
        curriculum,
      });

      // Navigate to the learning plan screen
      navigation.replace('LearningPlan', { learningRequestId: requestId });
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to create learning request');
    } finally {
      setIsLoading(false);
    }
  };

  const SelectButton = ({ label, isSelected }: { label: string; isSelected: boolean }) => (
    <View style={[
      styles.selectButton,
      isSelected && styles.selectButtonActive,
    ]}>
      <Text style={[
        styles.selectButtonText,
        isSelected && styles.selectButtonTextActive,
      ]}>
        {label}
      </Text>
    </View>
  );

  if (!user) {
    return <SafeAreaView style={styles.loadingContainer}><ActivityIndicator /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity onPress={() => navigation.goBack()}>
              <MaterialIcons name="arrow-back" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={typography.h2}>Request New Skill</Text>
            <View style={{ width: 24 }} />
          </View>

          {/* Form */}
          <View style={styles.form}>
            {/* Skill Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Skill/Topic I Want to Learn</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g., Advanced Excel, Python Programming"
                placeholderTextColor={colors.textTertiary}
                value={skill}
                onChangeText={setSkill}
                editable={!isLoading}
              />
            </View>

            {/* Reason Input */}
            <View style={styles.section}>
              <Text style={styles.label}>Why Do You Want to Learn This?</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Explain your motivation and how this will help you..."
                placeholderTextColor={colors.textTertiary}
                value={reason}
                onChangeText={setReason}
                multiline
                numberOfLines={4}
                editable={!isLoading}
                textAlignVertical="top"
              />
            </View>

            {/* Experience Level */}
            <View style={styles.section}>
              <Text style={styles.label}>Current Experience Level</Text>
              <View style={styles.optionsContainer}>
                <TouchableOpacity
                  onPress={() => setExperience('beginner')}
                  style={styles.optionFull}
                >
                  <SelectButton
                    label="Beginner"
                    isSelected={experience === 'beginner'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setExperience('some_experience')}
                  style={styles.optionFull}
                >
                  <SelectButton
                    label="Some Experience"
                    isSelected={experience === 'some_experience'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setExperience('intermediate')}
                  style={styles.optionFull}
                >
                  <SelectButton
                    label="Intermediate"
                    isSelected={experience === 'intermediate'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setExperience('advanced')}
                  style={styles.optionFull}
                >
                  <SelectButton
                    label="Advanced"
                    isSelected={experience === 'advanced'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Available Time */}
            <View style={styles.section}>
              <Text style={styles.label}>How Much Time Can You Spend Learning?</Text>
              <View style={styles.optionsGrid}>
                <TouchableOpacity
                  onPress={() => setTime('10_minutes')}
                  style={styles.optionHalf}
                >
                  <SelectButton
                    label="10 min/day"
                    isSelected={time === '10_minutes'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTime('20_minutes')}
                  style={styles.optionHalf}
                >
                  <SelectButton
                    label="20 min/day"
                    isSelected={time === '20_minutes'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTime('30_minutes')}
                  style={styles.optionHalf}
                >
                  <SelectButton
                    label="30 min/day"
                    isSelected={time === '30_minutes'}
                  />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setTime('60_minutes')}
                  style={styles.optionHalf}
                >
                  <SelectButton
                    label="60 min/day"
                    isSelected={time === '60_minutes'}
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Learning Goal */}
            <View style={styles.section}>
              <Text style={styles.label}>Learning Goal</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="What do you want to achieve after learning this skill?"
                placeholderTextColor={colors.textTertiary}
                value={goal}
                onChangeText={setGoal}
                multiline
                numberOfLines={4}
                editable={!isLoading}
                textAlignVertical="top"
              />
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[styles.submitButton, isLoading && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.background} />
              ) : (
                <>
                  <MaterialIcons name="check" size={20} color={colors.background} />
                  <Text style={styles.submitButtonText}>Create My Learning Plan</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
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
  form: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  label: {
    ...typography.caption,
    fontWeight: '600',
    color: colors.text,
    marginBottom: spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    color: colors.text,
    ...typography.body,
  },
  textArea: {
    minHeight: 100,
    paddingTop: spacing.md,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionFull: {
    width: '100%',
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  optionHalf: {
    width: '48%',
  },
  selectButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    backgroundColor: colors.surface,
  },
  selectButtonActive: {
    borderColor: colors.primary,
    backgroundColor: colors.primary,
  },
  selectButtonText: {
    ...typography.body,
    color: colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  selectButtonTextActive: {
    color: colors.background,
    fontWeight: '600',
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    paddingVertical: spacing.lg,
    borderRadius: radius.md,
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});