import React, { useState, useEffect, useCallback, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Modal, Alert, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useMutation, useAction } from 'convex/react';
import { api } from '../lib/config';
import { AuthContext } from '../lib/auth-context';
import { colors, spacing, radius, typography } from '../lib/theme';
import type { Id } from '../lib/config';
import { useWindowDimensions } from 'react-native';

const DAILY_MOTIVATIONS = [
  "Every expert was once a beginner — keep showing up.",
  "Small daily improvements lead to stunning long-term results.",
  "You don't have to be perfect, just be consistent.",
  "Today's effort is tomorrow's expertise.",
  "The only bad training day is the one you skip.",
  "Growth happens one question at a time.",
  "Knowledge is the one thing nobody can take from you.",
  "You're building something powerful — one day at a time.",
  "Discipline today, confidence tomorrow.",
  "Progress, not perfection, is what matters.",
  "Your future self will thank you for today's effort.",
  "Learning never exhausts the mind — it ignites it.",
  "Stay curious, stay sharp, stay ahead.",
  "Champions are made in the daily grind.",
  "Every correct answer is proof you're growing.",
  "Invest in your mind — the returns are limitless.",
  "Showing up is half the battle. You already won.",
  "Be proud of how far you've come. Keep going.",
  "The more you learn, the more doors open.",
  "Consistency beats talent when talent doesn't show up.",
  "You're one quiz closer to mastery.",
  "Believe in the power of daily practice.",
  "Hard work compounds. Trust the process.",
  "Your dedication today sets the standard for tomorrow.",
  "Great things never come from comfort zones.",
  "A little progress each day adds up to big results.",
  "You are capable of more than you know.",
  "Success is the sum of small efforts repeated daily.",
  "Keep pushing — breakthroughs are closer than you think.",
  "Embrace the grind. It's shaping who you'll become.",
  "The best time to grow is right now.",
];

function getDailyMotivation(): string {
  const now = new Date();
  const start = new Date(now.getFullYear(), 0, 0);
  const diff = now.getTime() - start.getTime();
  const dayOfYear = Math.floor(diff / (1000 * 60 * 60 * 24));
  return DAILY_MOTIVATIONS[dayOfYear % DAILY_MOTIVATIONS.length];
}

interface QuizQuestion {
  _id: Id<"dailyQuizQuestions">;
  question: string;
  options: string[];
  order: number;
}

const QUIZ_BADGES = [
  {
    title: "First Step",
    description: "Start a quiz and keep the momentum going.",
    icon: "rocket-launch" as const,
  },
  {
    title: "Quiz Finisher",
    description: "Complete today's quiz to unlock your progress badge.",
    icon: "verified" as const,
  },
  {
    title: "Passing Score",
    description: "Earn 70% or more to get the passing badge.",
    icon: "emoji-events" as const,
  },
];

export default function QuizScreen() {
  const auth = useContext(AuthContext);
  const { user } = auth ?? {};
  const { width } = useWindowDimensions();
  const isTablet = width >= 700;
  const [selectedScript, setSelectedScript] = useState<any>(null);
  const [selectedQuiz, setSelectedQuiz] = useState<any>(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Array<{ questionId: Id<"dailyQuizQuestions">, selectedAnswer: number }>>([]);
  const [showResults, setShowResults] = useState(false);
  const [quizResults, setQuizResults] = useState<any>(null);
  const [isEnsuring, setIsEnsuring] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [generationFailed, setGenerationFailed] = useState(false);
  const [showReadingFromResults, setShowReadingFromResults] = useState(false);

  const companyId = user?.companyId as Id<"companies"> | undefined;
  const userId = user?.userId as Id<"users"> | undefined;
  const currentBadge = quizResults?.passed ? QUIZ_BADGES[2] : quizResults ? QUIZ_BADGES[1] : QUIZ_BADGES[0];

  // Get today's scripts and quizzes
  const scripts = useQuery(
    api.dailyQuizzes.getTodayScripts,
    companyId && userId ? { userId, companyId } : "skip"
  );

  const quizzes = useQuery(
    api.dailyQuizzes.getTodayQuizzes,
    companyId && userId ? { userId, companyId } : "skip"
  );

  const questions = useQuery(
    api.dailyQuizzes.getQuizQuestions,
    selectedQuiz && userId ? { quizId: selectedQuiz._id, userId } : "skip"
  );

  // Get the source policy/reading for the selected quiz (for re-reading)
  const quizSource = useQuery(
    api.dailyQuizzes.getQuizSourcePolicy,
    selectedQuiz && userId ? { quizId: selectedQuiz._id, userId } : "skip"
  );

  const markScriptRead = useMutation(api.dailyQuizzes.markScriptAsRead);
  const submitQuiz = useMutation(api.dailyQuizzes.submitQuizAttempt);
  const ensureTodayContent = useAction(api.dailyQuizzes.ensureTodayContent);
  const generateQuizQuestionsNow = useAction(api.dailyQuizzes.generateQuizQuestionsNow);

  const ensureContent = useCallback(async () => {
    if (!companyId) return;
    setIsEnsuring(true);
    try {
      await ensureTodayContent({ companyId });
    } catch (e) {
      console.log('ensureTodayContent failed:', e);
    } finally {
      setIsEnsuring(false);
    }
  }, [companyId, ensureTodayContent]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (cancelled) return;
      await ensureContent();
    })();
    return () => {
      cancelled = true;
    };
  }, [ensureContent]);

  useEffect(() => {
    if (!selectedQuiz) return;
    if (isGeneratingQuestions) return;
    if (questions === undefined) return;
    if (questions.length > 0) return;

    let cancelled = false;
    const generate = async () => {
      setIsGeneratingQuestions(true);
      setGenerationFailed(false);
      try {
        await generateQuizQuestionsNow({ quizId: selectedQuiz._id });
      } catch (e) {
        console.log('generateQuizQuestionsNow failed:', e);
        if (!cancelled) setGenerationFailed(true);
      } finally {
        if (!cancelled) setIsGeneratingQuestions(false);
      }
    };
    void generate();
    return () => {
      cancelled = true;
    };
  }, [generateQuizQuestionsNow, isGeneratingQuestions, questions, selectedQuiz]);

  if (!auth) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.generatingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.generatingTitle}>Loading quiz access...</Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleStartQuiz = (quiz: any) => {
    setSelectedQuiz(quiz);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setShowResults(false);
    setQuizResults(null);
    setShowReadingFromResults(false);
  };

  const handleMarkRead = async () => {
    if (!selectedScript || !userId) return;
    try {
      await markScriptRead({ userId, scriptId: selectedScript._id });
      Alert.alert('Success', 'Reading marked as complete. You can now take the quiz!');
      setSelectedScript(null);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const handleSelectAnswer = (answerIndex: number) => {
    setSelectedAnswer(answerIndex);
  };

  const handleNextQuestion = () => {
    if (selectedAnswer === null || !questions) return;

    const currentQ = questions[currentQuestion];
    const newAnswers = [...answers, { questionId: currentQ._id, selectedAnswer }];
    setAnswers(newAnswers);

    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
      setSelectedAnswer(null);
    } else {
      // Submit quiz
      submitQuizAttempt(newAnswers);
    }
  };

  const submitQuizAttempt = async (finalAnswers: typeof answers) => {
    if (!selectedQuiz || !userId) return;
    try {
      const results = await submitQuiz({
        userId,
        quizId: selectedQuiz._id,
        answers: finalAnswers,
      });
      setQuizResults(results);
      setShowResults(true);
    } catch (error: any) {
      Alert.alert('Error', error.message);
    }
  };

  const resetQuiz = () => {
    setSelectedQuiz(null);
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setShowResults(false);
    setQuizResults(null);
    setShowReadingFromResults(false);
  };

  const handleRetakeQuiz = () => {
    // Reset quiz state but keep the same quiz selected
    setCurrentQuestion(0);
    setSelectedAnswer(null);
    setAnswers([]);
    setShowResults(false);
    setQuizResults(null);
    setShowReadingFromResults(false);
  };

  // Reading from results view (re-read the policy)
  if (showReadingFromResults && quizSource?.scriptContent) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.scriptHeader}>
          <TouchableOpacity onPress={() => setShowReadingFromResults(false)} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.scriptTitle}>Review Material</Text>
        </View>

        <ScrollView style={styles.scriptContent}>
          <Text style={styles.scriptMainTitle}>{quizSource.scriptTitle || quizSource.policyTitle || 'Reading Material'}</Text>
          <Text style={styles.scriptBody}>{quizSource.scriptContent}</Text>
        </ScrollView>

        <View style={styles.scriptFooter}>
          <TouchableOpacity style={styles.markReadBtn} onPress={() => setShowReadingFromResults(false)}>
            <MaterialIcons name="arrow-back" size={24} color={colors.background} />
            <Text style={styles.markReadText}>Back to Results</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Reading Script Modal
  if (selectedScript) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.scriptHeader}>
          <TouchableOpacity onPress={() => setSelectedScript(null)} style={styles.backBtn}>
            <MaterialIcons name="arrow-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.scriptTitle}>Daily Reading</Text>
        </View>

        <ScrollView style={styles.scriptContent}>
          <Text style={styles.scriptMainTitle}>{selectedScript.title}</Text>
          <Text style={styles.scriptBody}>{selectedScript.content}</Text>
        </ScrollView>

        <View style={styles.scriptFooter}>
          {selectedScript.isRead ? (
            <View style={styles.alreadyRead}>
              <MaterialIcons name="check-circle" size={24} color={colors.success} />
              <Text style={styles.alreadyReadText}>Already read</Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkRead}>
              <MaterialIcons name="check" size={24} color={colors.background} />
              <Text style={styles.markReadText}>I Have Read This</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Quiz View — questions are pre-generated, no loading/generating screen needed
  if (selectedQuiz && questions && questions.length > 0) {
    // Results view
    if (showResults && quizResults) {
      const canRetake = !quizResults.passed;
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <ScrollView style={styles.content}>
            <View style={styles.resultsContainer}>
              <MaterialIcons
                name={quizResults.passed ? "emoji-events" : "sentiment-dissatisfied"}
                size={80}
                color={quizResults.passed ? colors.success : colors.warning}
              />
              <Text style={styles.resultsTitle}>Quiz Complete!</Text>
              <Text style={styles.resultsScore}>{quizResults.score}%</Text>
              <Text style={styles.resultsDetails}>
                {quizResults.correctAnswers} of {quizResults.totalQuestions} correct
              </Text>
              <Text style={styles.attemptText}>Attempt #{quizResults.attemptNumber}</Text>

              <View style={styles.badgeCard}>
                <MaterialIcons name={currentBadge.icon} size={28} color={colors.secondary} />
                <View style={styles.badgeCardContent}>
                  <Text style={styles.badgeCardLabel}>Badge earned</Text>
                  <Text style={styles.badgeCardTitle}>{currentBadge.title}</Text>
                  <Text style={styles.badgeCardText}>{currentBadge.description}</Text>
                </View>
              </View>

              <View style={styles.resultsMessage}>
                {quizResults.passed ? (
                  <Text style={styles.resultsMessageText}>Great job! You've passed this quiz.</Text>
                ) : (
                  <>
                    <Text style={styles.resultsMessageText}>
                      You need 70% to pass. Review the reading material and try again.
                    </Text>
                    {quizResults.managerNotified && (
                      <Text style={styles.notifiedText}>
                        Your manager has been notified to provide additional support.
                      </Text>
                    )}
                  </>
                )}
              </View>

              <Text style={styles.motivationText}>{getDailyMotivation()}</Text>

              {/* Action buttons */}
              <View style={styles.resultActions}>
                {/* Read Material button */}
                {quizSource?.scriptContent && (
                  <TouchableOpacity
                    style={styles.readMaterialBtn}
                    onPress={() => setShowReadingFromResults(true)}
                  >
                    <MaterialIcons name="menu-book" size={20} color={colors.primary} />
                    <Text style={styles.readMaterialBtnText}>Review Reading Material</Text>
                  </TouchableOpacity>
                )}

                {/* Retake button (if not passed) */}
                {canRetake && (
                  <TouchableOpacity style={styles.retakeBtn} onPress={handleRetakeQuiz}>
                    <MaterialIcons name="replay" size={20} color={colors.background} />
                    <Text style={styles.retakeBtnText}>Retake Quiz</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity style={styles.doneBtn} onPress={resetQuiz}>
                  <Text style={styles.doneBtnText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </SafeAreaView>
      );
    }

    // Waiting for questions to load from DB
    if (questions.length === 0) {
      return (
        <SafeAreaView style={styles.container} edges={['top']}>
          <View style={styles.quizHeader}>
            <TouchableOpacity onPress={resetQuiz} style={styles.backBtn}>
              <MaterialIcons name="close" size={24} color={colors.text} />
            </TouchableOpacity>
            <Text style={styles.quizProgress}>Loading...</Text>
          </View>
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.generatingTitle}>Loading Questions...</Text>
          </View>
        </SafeAreaView>
      );
    }

    // Question view
    const question = questions[currentQuestion];

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={resetQuiz} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.quizProgress}>
            Question {currentQuestion + 1} of {questions.length}
          </Text>
        </View>

        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${((currentQuestion + 1) / questions.length) * 100}%` }]} />
        </View>

        <ScrollView style={styles.quizContent}>
          <Text style={styles.questionText}>{question.question}</Text>

          <View style={styles.optionsContainer}>
            {question.options.map((option: string, index: number) => (
              <TouchableOpacity
                key={index}
                style={[styles.option, selectedAnswer === index && styles.optionSelected]}
                onPress={() => handleSelectAnswer(index)}
              >
                <View style={[styles.optionRadio, selectedAnswer === index && styles.optionRadioSelected]}>
                  {selectedAnswer === index && <View style={styles.optionRadioInner} />}
                </View>
                <Text style={[styles.optionText, selectedAnswer === index && styles.optionTextSelected]}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        <View style={styles.quizFooter}>
          <TouchableOpacity
            style={[styles.nextBtn, selectedAnswer === null && styles.nextBtnDisabled]}
            onPress={handleNextQuestion}
            disabled={selectedAnswer === null}
          >
            <Text style={styles.nextBtnText}>
              {currentQuestion < questions.length - 1 ? 'Next Question' : 'Submit Quiz'}
            </Text>
            <MaterialIcons name="arrow-forward" size={24} color={colors.background} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  // Quiz selected but no questions loaded yet — auto-generating
  if (selectedQuiz && (!questions || questions.length === 0)) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.quizHeader}>
          <TouchableOpacity onPress={resetQuiz} style={styles.backBtn}>
            <MaterialIcons name="close" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.quizProgress}>Preparing Quiz</Text>
        </View>
        <View style={styles.generatingContainer}>
          {generationFailed ? (
            <>
              <MaterialIcons name="error-outline" size={64} color={colors.warning} />
              <Text style={styles.generatingTitle}>Question generation failed</Text>
              <Text style={styles.generatingSubtitle}>
                Please try again or go back and retry later.
              </Text>
              <TouchableOpacity
                style={[styles.nextBtn, { marginTop: spacing.lg, width: '80%' }]}
                onPress={() => {
                  setGenerationFailed(false);
                  setIsGeneratingQuestions(false);
                  // Re-trigger the useEffect
                  setSelectedQuiz({ ...selectedQuiz });
                }}
              >
                <MaterialIcons name="replay" size={20} color={colors.background} />
                <Text style={styles.nextBtnText}>Try Again</Text>
              </TouchableOpacity>
            </>
          ) : (
            <>
              <ActivityIndicator size="large" color={colors.primary} />
              <Text style={styles.generatingTitle}>Generating Questions...</Text>
              <Text style={styles.generatingSubtitle}>
                Creating quiz questions from your reading material. This takes a few seconds.
              </Text>
            </>
          )}
        </View>
      </SafeAreaView>
    );
  }

  // Main list view
  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.title}>Daily Training</Text>
        <Text style={styles.subtitle}>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</Text>
      </View>

      <ScrollView style={styles.content} contentContainerStyle={isTablet ? styles.contentTablet : undefined}>
        {/* Daily Motivation Card */}
        <View style={styles.motivationCard}>
          <MaterialIcons name="lightbulb" size={24} color={colors.primary} />
          <View style={styles.motivationCardContent}>
            <Text style={styles.motivationCardLabel}>Motivation of the Day</Text>
            <Text style={styles.motivationCardText}>{getDailyMotivation()}</Text>
          </View>
        </View>

        <View style={styles.badgePreviewCard}>
          <View style={styles.badgePreviewHeader}>
            <MaterialIcons name="military-tech" size={20} color={colors.secondary} />
            <Text style={styles.badgePreviewTitle}>Quiz badges</Text>
          </View>
          <Text style={styles.badgePreviewText}>Keep going to unlock recognition for completing and passing your quizzes.</Text>
          <View style={styles.badgePills}>
            {QUIZ_BADGES.map((badge) => (
              <View key={badge.title} style={styles.badgePill}>
                <MaterialIcons name={badge.icon} size={16} color={colors.secondary} />
                <Text style={styles.badgePillText}>{badge.title}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Loading indicator while ensuring content */}
        {isEnsuring && (!scripts || scripts.length === 0) && (!quizzes || quizzes.length === 0) && (
          <View style={styles.ensuringContainer}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.ensuringText}>Preparing today's training content...</Text>
          </View>
        )}

        {/* Reading Scripts Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="menu-book" size={20} color={colors.primary} /> Today's Reading
          </Text>

          {scripts && scripts.length > 0 ? (
            scripts.map((script: any) => (
              <TouchableOpacity
                key={script._id}
                style={styles.card}
                onPress={() => setSelectedScript(script)}
              >
                <View style={styles.cardIcon}>
                  <MaterialIcons
                    name={script.isRead ? "check-circle" : "menu-book"}
                    size={28}
                    color={script.isRead ? colors.success : colors.primary}
                  />
                </View>
                <View style={styles.cardContent}>
                  <Text style={styles.cardTitle}>{script.title}</Text>
                  <Text style={styles.cardMeta}>
                    {script.scriptType === 'general' ? 'General' : 'Team-specific'} •
                    {script.isRead ? ' Completed' : ' Not read'}
                  </Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={colors.textTertiary} />
              </TouchableOpacity>
            ))
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="menu-book" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No reading material for today</Text>
            </View>
          )}
        </View>

        {/* Quizzes Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            <MaterialIcons name="quiz" size={20} color={colors.secondary} /> Today's Quizzes
          </Text>

          {quizzes && quizzes.length > 0 ? (
            quizzes.map((quiz: any) => {
              const canTake = !quiz.hasScript || quiz.scriptRead;
              const showRetake = quiz.completed && !quiz.passed;
              const isLocked = !canTake;
              const isPassedDone = quiz.passed;

              return (
                <TouchableOpacity
                  key={quiz._id}
                  style={[styles.card, isLocked && styles.cardDisabled]}
                  onPress={() => {
                    if (isLocked) return;
                    if (isPassedDone) return;
                    handleStartQuiz(quiz);
                  }}
                  disabled={isLocked || isPassedDone}
                >
                  <View style={[styles.cardIcon, isPassedDone && styles.cardIconCompleted]}>
                    <MaterialIcons
                      name={isPassedDone ? "check-circle" : showRetake ? "replay" : "quiz"}
                      size={28}
                      color={isPassedDone ? colors.success : showRetake ? colors.warning : canTake ? colors.secondary : colors.textTertiary}
                    />
                  </View>
                  <View style={styles.cardContent}>
                    <Text style={[styles.cardTitle, isLocked && styles.cardTitleDisabled]}>{quiz.title}</Text>
                    <Text style={styles.cardMeta}>
                      {quiz.quizType === 'general' ? 'General' : 'Team-specific'} •
                      {quiz.questionCount} questions
                    </Text>
                    {isPassedDone && (
                      <Text style={styles.cardScore}>Passed! Best score: {quiz.bestScore}%</Text>
                    )}
                    {showRetake && (
                      <>
                        <Text style={styles.cardRetake}>
                          Last score: {quiz.score}% • Attempts: {quiz.attemptCount}
                        </Text>
                        <Text style={styles.cardRetakeHint}>Tap to retake</Text>
                      </>
                    )}
                    {isLocked && (
                      <Text style={styles.cardLocked}>Read the material first</Text>
                    )}
                    {canTake && !quiz.completed && (
                      <Text style={styles.cardFresh}>Tap to start quiz</Text>
                    )}
                  </View>
                  <MaterialIcons
                    name={isPassedDone ? "check" : showRetake ? "replay" : canTake ? "chevron-right" : "lock"}
                    size={24}
                    color={isPassedDone ? colors.success : showRetake ? colors.warning : canTake ? colors.textTertiary : colors.textTertiary}
                  />
                </TouchableOpacity>
              );
            })
          ) : (
            <View style={styles.emptyCard}>
              <MaterialIcons name="quiz" size={40} color={colors.textTertiary} />
              <Text style={styles.emptyText}>No quizzes for today</Text>
              <Text style={styles.emptyHint}>Quizzes are generated daily at midnight</Text>
            </View>
          )}
        </View>
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
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    ...typography.h2,
    color: colors.text,
  },
  subtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  motivationCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: colors.primary + '10',
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    gap: spacing.md,
  },
  motivationCardContent: {
    flex: 1,
  },
  motivationCardLabel: {
    ...typography.caption,
    color: colors.primary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  motivationCardText: {
    ...typography.body,
    color: colors.text,
    fontStyle: 'italic',
    lineHeight: 22,
  },
  badgePreviewCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
  },
  badgePreviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    marginBottom: spacing.xs,
  },
  badgePreviewTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '700',
  },
  badgePreviewText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 18,
  },
  badgePills: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  badgePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.secondary + '10',
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  badgePillText: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '600',
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    backgroundColor: colors.secondary + '10',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary + '30',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  badgeCardContent: {
    flex: 1,
  },
  badgeCardLabel: {
    ...typography.caption,
    color: colors.secondary,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: spacing.xs,
  },
  badgeCardTitle: {
    ...typography.bodyMedium,
    color: colors.text,
    fontWeight: '700',
  },
  badgeCardText: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
    lineHeight: 18,
  },
  ensuringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.md,
    marginBottom: spacing.md,
  },
  ensuringText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  contentTablet: {
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.md,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
  },
  cardDisabled: {
    opacity: 0.6,
  },
  cardIcon: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.primary + '15',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  cardIconCompleted: {
    backgroundColor: colors.success + '15',
  },
  cardContent: {
    flex: 1,
  },
  cardTitle: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  cardTitleDisabled: {
    color: colors.textTertiary,
  },
  cardMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  cardScore: {
    ...typography.caption,
    color: colors.success,
    fontWeight: '600',
    marginTop: spacing.xs,
  },
  cardRetake: {
    ...typography.caption,
    color: colors.warning,
    fontWeight: '500',
    marginTop: spacing.xs,
  },
  cardRetakeHint: {
    ...typography.caption,
    color: colors.primary,
    fontStyle: 'italic',
    marginTop: 2,
  },
  cardLocked: {
    ...typography.caption,
    color: colors.warning,
    marginTop: spacing.xs,
  },
  cardFresh: {
    ...typography.caption,
    color: colors.primary,
    marginTop: spacing.xs,
    fontStyle: 'italic',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    alignItems: 'center',
  },
  emptyText: {
    ...typography.body,
    color: colors.textTertiary,
    marginTop: spacing.md,
  },
  emptyHint: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.sm,
  },
  // Script styles
  scriptHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  backBtn: {
    marginRight: spacing.md,
  },
  scriptTitle: {
    ...typography.h4,
    color: colors.text,
  },
  scriptContent: {
    flex: 1,
    padding: spacing.lg,
  },
  scriptMainTitle: {
    ...typography.h3,
    color: colors.text,
    marginBottom: spacing.lg,
  },
  scriptBody: {
    ...typography.body,
    color: colors.text,
    lineHeight: 26,
  },
  scriptFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  markReadText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  alreadyRead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  alreadyReadText: {
    ...typography.body,
    color: colors.success,
  },
  // Quiz styles
  quizHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  quizProgress: {
    ...typography.body,
    color: colors.text,
    fontWeight: '600',
  },
  progressBar: {
    height: 4,
    backgroundColor: colors.border,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.primary,
  },
  quizContent: {
    flex: 1,
    padding: spacing.lg,
  },
  questionText: {
    ...typography.h4,
    color: colors.text,
    marginBottom: spacing.xl,
    lineHeight: 28,
  },
  optionsContainer: {
    gap: spacing.sm,
  },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 2,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: colors.primary,
    backgroundColor: colors.primary + '10',
  },
  optionRadio: {
    width: 24,
    height: 24,
    borderRadius: radius.full,
    borderWidth: 2,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionRadioSelected: {
    borderColor: colors.primary,
  },
  optionRadioInner: {
    width: 12,
    height: 12,
    borderRadius: radius.full,
    backgroundColor: colors.primary,
  },
  optionText: {
    flex: 1,
    ...typography.body,
    color: colors.text,
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  quizFooter: {
    padding: spacing.lg,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  nextBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  nextBtnDisabled: {
    backgroundColor: colors.textTertiary,
  },
  nextBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  // Results styles
  resultsContainer: {
    alignItems: 'center',
    padding: spacing.xl,
  },
  resultsTitle: {
    ...typography.h2,
    color: colors.text,
    marginTop: spacing.lg,
  },
  resultsScore: {
    fontSize: 64,
    fontWeight: '700',
    color: colors.primary,
    marginTop: spacing.md,
  },
  resultsDetails: {
    ...typography.body,
    color: colors.textSecondary,
  },
  attemptText: {
    ...typography.caption,
    color: colors.textTertiary,
    marginTop: spacing.xs,
  },
  resultsMessage: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xl,
    marginBottom: spacing.md,
    width: '100%',
  },
  resultsMessageText: {
    ...typography.body,
    color: colors.text,
    textAlign: 'center',
  },
  notifiedText: {
    ...typography.caption,
    color: colors.warning,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
  resultActions: {
    width: '100%',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  readMaterialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary + '15',
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.primary + '30',
  },
  readMaterialBtnText: {
    ...typography.body,
    color: colors.primary,
    fontWeight: '600',
  },
  retakeBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.warning,
    borderRadius: radius.md,
    padding: spacing.md,
    gap: spacing.sm,
  },
  retakeBtnText: {
    ...typography.body,
    color: colors.background,
    fontWeight: '600',
  },
  doneBtn: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xxl,
    alignItems: 'center',
  },
  doneBtnText: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  // Generating state styles
  generatingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  generatingTitle: {
    ...typography.h3,
    color: colors.text,
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  generatingSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  motivationText: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'center',
    fontStyle: 'italic',
    marginBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    lineHeight: 22,
  },
});