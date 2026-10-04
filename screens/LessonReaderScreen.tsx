import React, { useState, useContext, useRef, useEffect } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api, API_KEYS } from '../lib/config';

const SECTIONS = ['introduction', 'objectives', 'explanation', 'examples', 'application', 'keypoints', 'knowledge_check', 'completed'];
const LESSON_GENERATION_TIMEOUT_MS = 20000;

function buildStarterLessonContent(lesson: any, learningPlan: any) {
  const keyPoints = lesson.keyPoints?.length ? lesson.keyPoints : [lesson.title];
  const topic = lesson.title;
  const skill = learningPlan.request.skill;
  const goal = learningPlan.request.learningGoal;

  return {
    introduction: lesson.description || `This lesson helps you use ${topic} in a practical way for ${skill}.`,
    objectives: keyPoints.slice(0, 3).map((point: string) => `Understand and apply: ${point}`),
    mainExplanation: `${topic} matters because it connects directly to your goal: ${goal}. Start with the core idea, notice where it appears in real work, then practise it using a small task instead of only reading about it. Focus on what the concept means, when to use it, and what mistake to avoid.`,
    examples: [
      {
        title: `Easy example: ${topic} in a simple situation`,
        description: `Situation: You need to explain ${topic} to someone with no background.\nWalk-through: Pick one key point, define it in plain language, then give one small action someone can take.\nWhy it works: It proves you understand the idea, not just the words.\nCommon mistake: Repeating the definition without showing how it is used.`,
      },
      {
        title: `Real-world example: using ${topic} at work`,
        description: `Situation: You face a normal workplace task related to ${skill}.\nWalk-through: Identify the problem, choose the most relevant key point, apply it, then check whether the result supports your goal: ${goal}.\nWhy it works: It turns the lesson into a decision-making process.\nCommon mistake: Trying to apply every idea at once instead of choosing the one that fits the situation.`,
      },
      {
        title: `Challenge example: handling a harder ${topic} case`,
        description: `Situation: The answer is not obvious and there are tradeoffs.\nWalk-through: Compare two possible actions, explain the risk of each, then choose the action that best matches the lesson principles.\nWhy it works: It builds judgement, not memorisation.\nCommon mistake: Choosing the fastest answer without checking consequences.`,
      },
    ],
    practicalApplication: `Write down one real situation where you can use ${topic}. Then answer: What is the first step? What could go wrong? How will you know you applied it correctly?`,
    keyPoints,
    knowledgeCheck: {
      question: `You need to apply ${topic} in a real situation. What is the best first move?`,
      options: [
        'Identify the situation and choose the most relevant lesson principle',
        'Memorise the title and move on',
        'Skip the difficult parts',
        'Use every idea at once without checking the context',
      ],
      correctAnswer: 0,
      explanation: 'Real learning starts by matching the principle to the situation. That is how you turn content into useful action.',
    },
  };
}

async function generateLessonContentWithAI(params: {
  skill: string;
  learningGoal: string;
  lessonTitle: string;
  lessonDescription?: string;
  keyPoints: string[];
  estimatedDurationMinutes: number;
}) {
  const prompt = `Create a practical mobile lesson for "${params.skill}".

Learner goal: ${params.learningGoal}
Lesson title: ${params.lessonTitle}
Lesson description: ${params.lessonDescription || 'No description provided'}
Target duration: ${params.estimatedDurationMinutes} minutes
Required key points: ${params.keyPoints.join(', ')}

This must be real learning, not something to read and pass. Make it valuable, specific, and engaging.
Rules:
- Match the actual difficulty of the topic. Do not make hard topics shallow. Do not overcomplicate easy topics.
- Explain the concept clearly with practical detail.
- Include exactly 3 examples: one simple, one realistic workplace/practical example, and one more challenging example.
- Each example description must include: Situation, Walk-through, Why it works, and Common mistake.
- Practical application must be an actionable mini-task the learner can do now.
- Knowledge check must be scenario-based with 4 options and a useful explanation.

Return ONLY valid JSON with this exact structure:
{
  "title": "Lesson title",
  "introduction": "A short hook explaining why this matters",
  "objectives": ["Objective 1", "Objective 2", "Objective 3"],
  "mainExplanation": "Detailed teaching content with concrete steps and reasoning",
  "examples": [
    { "title": "Simple example", "description": "Situation: ...\nWalk-through: ...\nWhy it works: ...\nCommon mistake: ..." },
    { "title": "Real-world example", "description": "Situation: ...\nWalk-through: ...\nWhy it works: ...\nCommon mistake: ..." },
    { "title": "Challenge example", "description": "Situation: ...\nWalk-through: ...\nWhy it works: ...\nCommon mistake: ..." }
  ],
  "practicalApplication": "A mini-task with steps and expected result",
  "keyPoints": ["Key point 1", "Key point 2", "Key point 3"],
  "knowledgeCheck": {
    "question": "Scenario question",
    "options": ["Option A", "Option B", "Option C", "Option D"],
    "correctAnswer": 0,
    "explanation": "Why the correct answer is right and why the others are weaker"
  }
}`;

  const response = await fetch(API_KEYS.ai_api_url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
  });

  if (!response.ok) {
    throw new Error('Could not generate lesson content. Please try again.');
  }

  const data = await response.json();
  const completion = String(data.completion || '').replace(/```json|```/g, '').trim();
  return JSON.parse(completion);
}

export default function LessonReaderScreen({ route, navigation }: any) {
  const { user } = useContext(AuthContext);
  const { userId, lessonId, lessonIds = [], learningRequestId, lessonNumber, totalLessons } = route.params;
  const [currentSectionIndex, setCurrentSectionIndex] = useState(0);
  const [knowledgeAnswer, setKnowledgeAnswer] = useState<number | null>(null);
  const [isGeneratingContent, setIsGeneratingContent] = useState(false);
  const generatingLessonIdRef = useRef<string | null>(null);
  const scrollViewRef = useRef<any>(null);

  const learningPlan = useQuery(
    api.aiLearningPlanner.getLearningPlan,
    learningRequestId ? { learningRequestId } : 'skip'
  );

  const lessonBook =
    lessonIds.length > 0
      ? lessonIds
      : learningPlan?.modules.flatMap((module: any) => module.lessons.map((lesson: any) => lesson._id)) ?? [];
  const activeLessonId = lessonId ?? lessonBook[0] ?? null;

  const currentLessonIndex = activeLessonId
    ? lessonBook.findIndex((id: string) => String(id) === String(activeLessonId))
    : -1;
  const nextLessonId =
    currentLessonIndex >= 0
      ? lessonBook[currentLessonIndex + 1] ?? null
      : lessonBook[Number(lessonNumber) || 0] ?? null;

  const data = useQuery(
    api.lessonContent.getLessonWithProgress,
    userId && activeLessonId ? { userId, lessonId: activeLessonId, learningRequestId } : 'skip'
  );

  const createProgress = useMutation(api.lessonContent.createLessonProgress);
  const updateProgress = useMutation(api.lessonContent.updateLessonProgress);
  const markCompleted = useMutation(api.lessonContent.markLessonCompleted);
  const saveLessonContent = useMutation(api.lessonContent.saveLessonContent);

  useEffect(() => {
    if (!data?.progress && userId && activeLessonId && learningRequestId) {
      createProgress({ userId, lessonId: activeLessonId, learningRequestId });
    }
  }, [data?.progress, createProgress, userId, activeLessonId, learningRequestId]);

  useEffect(() => {
    if (!data || !learningPlan || data.content || isGeneratingContent || !activeLessonId || !learningRequestId) {
      return;
    }

    if (generatingLessonIdRef.current === String(activeLessonId)) {
      return;
    }

    generatingLessonIdRef.current = String(activeLessonId);
    let isMounted = true;
    const timeoutId = setTimeout(() => {
      if (isMounted) setIsGeneratingContent(false);
    }, LESSON_GENERATION_TIMEOUT_MS);

    const generateAndSaveContent = async () => {
      try {
        setIsGeneratingContent(true);
        const generatedContent = await generateLessonContentWithAI({
          skill: learningPlan.request.skill,
          learningGoal: learningPlan.request.learningGoal,
          lessonTitle: data.lesson.title,
          lessonDescription: data.lesson.description,
          keyPoints: data.lesson.keyPoints || [],
          estimatedDurationMinutes: data.lesson.estimatedDurationMinutes,
        });

        if (!isMounted) return;

        await saveLessonContent({
          lessonId: activeLessonId,
          learningRequestId,
          title: generatedContent.title || data.lesson.title,
          introduction: generatedContent.introduction,
          objectives: generatedContent.objectives,
          mainExplanation: generatedContent.mainExplanation,
          examples: generatedContent.examples,
          practicalApplication: generatedContent.practicalApplication,
          keyPoints: generatedContent.keyPoints,
          knowledgeCheck: generatedContent.knowledgeCheck,
        });
      } catch (error) {
        console.warn('Lesson AI content generation failed', error);
      } finally {
        clearTimeout(timeoutId);
        if (isMounted) setIsGeneratingContent(false);
      }
    };

    generateAndSaveContent();

    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [data, learningPlan, isGeneratingContent, activeLessonId, learningRequestId, saveLessonContent]);

  if (!data || !learningPlan) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading lesson...</Text>
      </SafeAreaView>
    );
  }

  const { lesson, content, progress } = data;
  const safeContent = content ?? buildStarterLessonContent(lesson, learningPlan);
  const currentSection = SECTIONS[currentSectionIndex];

  const goToLesson = (targetLessonId: string) => {
    navigation.replace('LessonReader', {
      lessonNumber: (currentLessonIndex >= 0 ? currentLessonIndex : Number(lessonNumber) || 0) + 2,
      totalLessons: lessonBook.length || totalLessons,
      learningRequestId,
      lessonId: targetLessonId,
      lessonIds: lessonBook,
      userId,
    });
  };

  const handleNext = async () => {
    if (currentSectionIndex < SECTIONS.length - 1) {
      const nextIndex = currentSectionIndex + 1;
      setCurrentSectionIndex(nextIndex);

      if (progress?._id) {
        await updateProgress({
          progressId: progress._id,
          currentSection: SECTIONS[nextIndex],
          timeSpentMinutes: 2,
        });
      }

      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handlePrevious = () => {
    if (currentSectionIndex > 0) {
      setCurrentSectionIndex(currentSectionIndex - 1);
      scrollViewRef.current?.scrollTo({ y: 0, animated: true });
    }
  };

  const handleMarkComplete = async () => {
    if (knowledgeAnswer === null) {
      Alert.alert('Answer Required', 'Please select an answer before proceeding.');
      return;
    }

    const isCorrect = knowledgeAnswer === safeContent.knowledgeCheck.correctAnswer;
    if (progress?._id) {
      await markCompleted({
        progressId: progress._id,
        knowledgeCheckCorrect: isCorrect,
      });
    }

    const title = isCorrect ? 'Correct!' : 'Not Quite Right';
    const message = isCorrect
      ? 'Great job! You have completed this lesson.'
      : 'That is not quite right. Review the material and try again.';

    Alert.alert(title, message, [
      {
        text: 'Next',
        onPress: () => {
          if (nextLessonId) {
            goToLesson(nextLessonId);
          } else {
            navigation.replace('MyLearning');
          }
        },
      },
    ]);
  };

  const renderSection = () => {
    switch (currentSection) {
      case 'introduction':
        return (
          <View>
            <Text style={styles.sectionTitle}>Introduction</Text>
            <Text style={styles.content}>{safeContent.introduction}</Text>
          </View>
        );

      case 'objectives':
        return (
          <View>
            <Text style={styles.sectionTitle}>Learning Objectives</Text>
            {safeContent.objectives.map((obj: string, idx: number) => (
              <View key={idx} style={styles.objectiveRow}>
                <MaterialIcons name="check-circle" size={20} color={colors.primary} />
                <Text style={styles.objectiveText}>{obj}</Text>
              </View>
            ))}
          </View>
        );

      case 'explanation':
        return (
          <View>
            <Text style={styles.sectionTitle}>Main Concept</Text>
            <Text style={styles.content}>{safeContent.mainExplanation}</Text>
          </View>
        );

      case 'examples':
        return (
          <View>
            <Text style={styles.sectionTitle}>Learn by Example</Text>
            <Text style={styles.helperText}>Examples move from easy to harder so you can see the idea in action before using it yourself.</Text>
            {safeContent.examples.length > 0 ? (
              safeContent.examples.map((example: any, idx: number) => {
                const labels = ['Easy', 'Real-world', 'Challenge'];
                return (
                  <View key={idx} style={styles.exampleBox}>
                    <View style={styles.exampleHeader}>
                      <View style={styles.exampleBadge}>
                        <Text style={styles.exampleBadgeText}>{labels[idx] || `Example ${idx + 1}`}</Text>
                      </View>
                      <Text style={styles.exampleTitle}>{example.title}</Text>
                    </View>
                    {String(example.description).split('\n').filter(Boolean).map((line: string, lineIdx: number) => (
                      <Text key={lineIdx} style={line.includes(':') ? styles.exampleStep : styles.exampleText}>{line}</Text>
                    ))}
                  </View>
                );
              })
            ) : (
              <View style={styles.exampleBox}>
                <Text style={styles.exampleTitle}>Practical example</Text>
                <Text style={styles.exampleText}>{lesson.description || safeContent.mainExplanation}</Text>
                <Text style={styles.exampleStep}>Try this: explain the idea in your own words, then write one place you can use it today.</Text>
              </View>
            )}
          </View>
        );

      case 'application':
        return (
          <View>
            <Text style={styles.sectionTitle}>Practice It Now</Text>
            <View style={styles.practiceCard}>
              <MaterialIcons name="edit-note" size={28} color={colors.primary} />
              <View style={{ flex: 1 }}>
                <Text style={styles.practiceTitle}>Mini-task</Text>
                <Text style={styles.content}>{safeContent.practicalApplication}</Text>
              </View>
            </View>
          </View>
        );

      case 'keypoints':
        return (
          <View>
            <Text style={styles.sectionTitle}>Key Points</Text>
            {safeContent.keyPoints.map((point: string, idx: number) => (
              <View key={idx} style={styles.keyPointRow}>
                <Text style={styles.keyPointBullet}>•</Text>
                <Text style={styles.keyPointText}>{point}</Text>
              </View>
            ))}
          </View>
        );

      case 'knowledge_check':
        return (
          <View>
            <Text style={styles.sectionTitle}>Knowledge Check</Text>
            <Text style={styles.questionText}>{safeContent.knowledgeCheck.question}</Text>
            {safeContent.knowledgeCheck.options.map((option: string, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.answerOption,
                  knowledgeAnswer === idx && styles.answerOptionSelected,
                ]}
                onPress={() => setKnowledgeAnswer(idx)}
              >
                <View style={[styles.answerRadio, knowledgeAnswer === idx && styles.answerRadioSelected]}>
                  {knowledgeAnswer === idx && <View style={styles.answerRadioDot} />}
                </View>
                <Text style={styles.answerText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        );

      case 'completed':
        return (
          <View style={styles.completedContainer}>
            <MaterialIcons name="check-circle" size={64} color={colors.primary} />
            <Text style={styles.completedTitle}>Lesson Complete!</Text>
            <Text style={styles.completedText}>Great job completing this lesson.</Text>
          </View>
        );

      default:
        return null;
    }
  };

  const progress_pct = Math.round(((currentSectionIndex + 1) / SECTIONS.length) * 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={typography.body}>Lesson {lessonNumber} of {lessonBook.length || totalLessons}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress_pct}%` }]} />
        </View>
        <Text style={styles.progressText}>{progress_pct}% Complete</Text>
      </View>

      <ScrollView
        ref={scrollViewRef}
        style={styles.contentScroll}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.contentContainer}
      >
        <View style={styles.lessonHeader}>
          <Text style={styles.lessonTitle}>{lesson.title}</Text>
          <Text style={styles.sectionIndicator}>{currentSection === 'knowledge_check' ? 'Final Check' : currentSection.replace('_', ' ').toUpperCase()}</Text>
        </View>

        {renderSection()}
      </ScrollView>

      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[styles.navButton, currentSectionIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentSectionIndex === 0}
        >
          <MaterialIcons name="arrow-back" size={20} color={currentSectionIndex === 0 ? colors.textSecondary : colors.primary} />
          <Text style={[styles.navButtonText, currentSectionIndex === 0 && styles.navButtonTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.navButton, styles.nextButton]}
          onPress={currentSection === 'knowledge_check' ? handleMarkComplete : handleNext}
        >
          <Text style={styles.nextButtonText}>{currentSection === 'knowledge_check' ? 'Submit' : 'Next'}</Text>
          <MaterialIcons name="arrow-forward" size={20} color={colors.background} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    paddingHorizontal: spacing.lg,
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
  progressSection: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: colors.surface,
    borderRadius: 3,
    overflow: 'hidden',
    marginBottom: spacing.sm,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  progressText: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  contentScroll: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  lessonHeader: {
    marginBottom: spacing.xl,
  },
  lessonTitle: {
    ...typography.h2,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  sectionIndicator: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  sectionTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  content: {
    ...typography.body,
    color: colors.text,
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  objectiveRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  objectiveText: {
    ...typography.body,
    color: colors.text,
    marginLeft: spacing.md,
    flex: 1,
  },
  helperText: {
    ...typography.bodyMedium,
    color: colors.textSecondary,
    marginBottom: spacing.lg,
  },
  exampleBox: {
    backgroundColor: colors.surface,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    borderRadius: radius.md,
  },
  exampleHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  exampleBadge: {
    backgroundColor: colors.primary + '15',
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  exampleBadgeText: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
  },
  exampleTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  exampleText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
  },
  exampleStep: {
    ...typography.bodyMedium,
    color: colors.text,
    lineHeight: 22,
    marginBottom: spacing.sm,
    fontWeight: '500',
  },
  practiceCard: {
    flexDirection: 'row',
    gap: spacing.md,
    backgroundColor: colors.primary + '10',
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary + '25',
  },
  practiceTitle: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '700',
    marginBottom: spacing.sm,
  },
  keyPointRow: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  keyPointBullet: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  keyPointText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
    lineHeight: 20,
  },
  questionText: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: '500',
  },
  answerOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.md,
    borderWidth: 2,
    borderColor: colors.border,
  },
  answerOptionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  answerRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  answerRadioSelected: {
    borderColor: colors.primary,
  },
  answerRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  answerText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
  },
  completedContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
  },
  completedTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  completedText: {
    ...typography.body,
    color: colors.textSecondary,
  },
  navigationBar: {
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.background,
  },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  navButtonDisabled: {
    opacity: 0.5,
    borderColor: colors.border,
  },
  navButtonText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  navButtonTextDisabled: {
    color: colors.textSecondary,
  },
  nextButton: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  nextButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});