import React, { useState, useContext } from 'react';
import { StyleSheet, View, ScrollView, Text, SafeAreaView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation } from 'convex/react';
import { colors, spacing, radius, typography } from '../lib/theme';
import { AuthContext } from '../lib/auth-context';
import { api } from '../lib/config';

export default function PersonalLearningQuizScreen({ route, navigation }: any) {
  const { userId, quizId, lessonTitle } = route.params;
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<any>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);

  const quizData = useQuery(api.personalLearningQuiz.getPersonalLearningQuiz, { quizId });
  const submitAnswers = useMutation(api.personalLearningQuiz.submitQuizAnswers);

  if (!quizData) {
    return (
      <SafeAreaView style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
      </SafeAreaView>
    );
  }

  const { questions } = quizData;
  const currentQuestion = questions[currentQuestionIndex];
  const questionsAnswered = Object.keys(answers).length;
  const progressPct = Math.round(((currentQuestionIndex + 1) / questions.length) * 100);

  const handleAnswerSelect = (optionIndex: number) => {
    setAnswers({
      ...answers,
      [currentQuestion._id]: optionIndex,
    });
  };

  const handleNext = () => {
    if (!answers[currentQuestion._id]) {
      Alert.alert('Answer Required', 'Please select an answer before proceeding.');
      return;
    }

    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleSubmitQuiz = async () => {
    if (questionsAnswered < questions.length) {
      Alert.alert('Incomplete', 'Please answer all questions before submitting.');
      return;
    }

    try {
      const answerArray = questions.map((q: any) => ({
        questionId: q._id,
        answer: answers[q._id],
      }));

      const results = await submitAnswers({
        userId: userId as any,
        quizId: quizId as any,
        lessonId: route.params.lessonId,
        learningRequestId: route.params.learningRequestId,
        answers: answerArray,
      });

      setQuizResults(results);
      setShowFeedback(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to submit quiz');
    }
  };

  if (showFeedback && quizResults) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={typography.body}>Quiz Complete</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          <View style={styles.scoreContainer}>
            <MaterialIcons
              name={quizResults.passed ? "check-circle" : "error"}
              size={64}
              color={quizResults.passed ? colors.success : colors.warning}
            />
            <Text style={styles.scoreText}>{quizResults.score}%</Text>
            <Text style={styles.scoreLabel}>
              {quizResults.passed ? "Great Job!" : "Keep Learning"}
            </Text>
            <Text style={styles.scoreSubtitle}>
              {quizResults.correctAnswers} of {quizResults.totalQuestions} correct
            </Text>
          </View>

          <View style={styles.feedbackContainer}>
            <Text style={styles.feedbackTitle}>Review Answers</Text>
            {quizResults.feedback.map((item: any, idx: number) => {
              const question = questions.find((q: any) => q._id === item.questionId);
              return (
                <View key={idx} style={styles.feedbackItem}>
                  <View style={styles.feedbackHeader}>
                    <MaterialIcons
                      name={item.isCorrect ? "check" : "close"}
                      size={20}
                      color={item.isCorrect ? colors.success : colors.warning}
                    />
                    <Text style={[styles.feedbackStatus, { color: item.isCorrect ? colors.success : colors.warning }]}>
                      {item.isCorrect ? "Correct" : "Incorrect"}
                    </Text>
                  </View>
                  <Text style={styles.feedbackQuestion}>{question.question}</Text>
                  <View style={styles.explanationBox}>
                    <Text style={styles.explanationLabel}>Explanation:</Text>
                    <Text style={styles.explanationText}>{item.explanation}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={() => {
            navigation.navigate('MyLearning');
          }}
        >
          <Text style={styles.continueButtonText}>Continue Learning</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <MaterialIcons name="close" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={typography.body}>Question {currentQuestionIndex + 1} of {questions.length}</Text>
        <View style={{ width: 24 }} />
      </View>

      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progressPct}%` }]} />
        </View>
        <Text style={styles.progressText}>{progressPct}% Complete</Text>
      </View>

      <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
        <View style={styles.questionContainer}>
          <View style={[styles.difficultyBadge, { backgroundColor: getDifficultyColor(currentQuestion.difficulty) }]}>
            <Text style={styles.difficultyText}>{currentQuestion.difficulty.toUpperCase()}</Text>
          </View>

          <Text style={styles.question}>{currentQuestion.question}</Text>

          <View style={styles.optionsContainer}>
            {currentQuestion.options.map((option: string, idx: number) => (
              <TouchableOpacity
                key={idx}
                style={[
                  styles.optionButton,
                  answers[currentQuestion._id] === idx && styles.optionButtonSelected,
                ]}
                onPress={() => handleAnswerSelect(idx)}
              >
                <View
                  style={[
                    styles.optionRadio,
                    answers[currentQuestion._id] === idx && styles.optionRadioSelected,
                  ]}
                >
                  {answers[currentQuestion._id] === idx && (
                    <View style={styles.optionRadioDot} />
                  )}
                </View>
                <Text style={styles.optionText}>{option}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      <View style={styles.navigationBar}>
        <TouchableOpacity
          style={[styles.navButton, currentQuestionIndex === 0 && styles.navButtonDisabled]}
          onPress={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          <MaterialIcons name="arrow-back" size={20} color={currentQuestionIndex === 0 ? colors.textSecondary : colors.primary} />
          <Text style={[styles.navButtonText, currentQuestionIndex === 0 && styles.navButtonTextDisabled]}>Previous</Text>
        </TouchableOpacity>

        {currentQuestionIndex < questions.length - 1 ? (
          <TouchableOpacity style={[styles.navButton, styles.nextButton]} onPress={handleNext}>
            <Text style={styles.nextButtonText}>Next</Text>
            <MaterialIcons name="arrow-forward" size={20} color={colors.background} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={[styles.navButton, styles.submitButton]} onPress={handleSubmitQuiz}>
            <Text style={styles.submitButtonText}>Submit Quiz</Text>
            <MaterialIcons name="check" size={20} color={colors.background} />
          </TouchableOpacity>
        )}
      </View>
    </SafeAreaView>
  );
}

function getDifficultyColor(difficulty: string): string {
  switch (difficulty) {
    case 'easy':
      return '#4CAF50';
    case 'medium':
      return '#FF9800';
    case 'hard':
      return '#F44336';
    default:
      return '#2196F3';
  }
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
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  progressContainer: {
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
  questionContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
  },
  difficultyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.full,
    marginBottom: spacing.lg,
  },
  difficultyText: {
    ...typography.caption,
    color: colors.background,
    fontWeight: '600',
  },
  question: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: '500',
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.md,
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    borderWidth: 2,
    borderColor: colors.border,
  },
  optionButtonSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.textSecondary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.lg,
  },
  optionRadioSelected: {
    borderColor: colors.primary,
  },
  optionRadioDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
  },
  optionText: {
    ...typography.body,
    color: colors.text,
    flex: 1,
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
  submitButton: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  submitButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  scoreContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  scoreText: {
    ...typography.h1,
    color: colors.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  scoreLabel: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.sm,
  },
  scoreSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  feedbackContainer: {
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  feedbackTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
    fontWeight: '600',
  },
  feedbackItem: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.lg,
    marginBottom: spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  feedbackHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
    gap: spacing.md,
  },
  feedbackStatus: {
    ...typography.body,
    fontWeight: '600',
  },
  feedbackQuestion: {
    ...typography.body,
    color: colors.text,
    marginBottom: spacing.md,
    fontWeight: '500',
  },
  explanationBox: {
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  explanationLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  explanationText: {
    ...typography.body,
    color: colors.text,
    lineHeight: 20,
  },
  continueButton: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.lg,
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    alignItems: 'center',
  },
  continueButtonText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
});
