import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Generate AI quiz for a lesson (called after lesson completion)
export const generateLessonQuiz = mutation({
  args: {
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    dayNumber: v.number(),
    lessonContent: v.object({
      title: v.string(),
      mainExplanation: v.string(),
      examples: v.array(v.string()),
      keyPoints: v.array(v.string()),
      practicalApplication: v.string(),
    }),
    experienceLevel: v.union(
      v.literal("beginner"),
      v.literal("some_experience"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
  },
  returns: v.id("learning_quizzes"),
  async handler(ctx, args) {
    // Create quiz record
    const quizId = await ctx.db.insert("learning_quizzes", {
      lessonId: args.lessonId,
      learningRequestId: args.learningRequestId,
      dayNumber: args.dayNumber,
      title: `Quiz: ${args.lessonContent.title}`,
      description: `Test your knowledge on ${args.lessonContent.title}`,
      questionsCount: 5,
      generatedAt: Date.now(),
    });

    // Generate 5 quiz questions from lesson content
    // This would be called from frontend with AI-generated questions
    // For now, we return the quizId for the frontend to use
    
    return quizId;
  },
});

// Save generated quiz questions from AI
export const saveQuizQuestions = mutation({
  args: {
    quizId: v.id("learning_quizzes"),
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    questions: v.array(
      v.object({
        type: v.union(
          v.literal("multiple_choice"),
          v.literal("true_false"),
          v.literal("multiple_answer"),
          v.literal("scenario")
        ),
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.union(v.number(), v.array(v.number())),
        explanation: v.string(),
        sourceContent: v.string(),
        difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
      })
    ),
  },
  returns: v.array(v.id("learning_quiz_questions")),
  async handler(ctx, args) {
    const questionIds: any[] = [];

    for (let i = 0; i < args.questions.length; i++) {
      const q = args.questions[i];
      const questionId = await ctx.db.insert("learning_quiz_questions", {
        quizId: args.quizId,
        lessonId: args.lessonId,
        learningRequestId: args.learningRequestId,
        questionType: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sourceContent: q.sourceContent,
        order: i,
        difficulty: q.difficulty,
        createdAt: Date.now(),
      });
      questionIds.push(questionId);

      // Add to question history to avoid repetition
      await ctx.db.insert("learning_question_history", {
        learningRequestId: args.learningRequestId,
        lessonId: args.lessonId,
        questionText: q.question,
        category: q.type,
        dateAsked: new Date().toISOString().split('T')[0],
        createdAt: Date.now(),
      });
    }

    return questionIds;
  },
});

// Get quiz for display
export const getPersonalLearningQuiz = query({
  args: {
    quizId: v.id("learning_quizzes"),
  },
  returns: v.union(
    v.object({
      _id: v.id("learning_quizzes"),
      title: v.string(),
      description: v.optional(v.string()),
      questionsCount: v.number(),
      questions: v.array(
        v.object({
          _id: v.id("learning_quiz_questions"),
          questionType: v.string(),
          question: v.string(),
          options: v.array(v.string()),
          order: v.number(),
          difficulty: v.string(),
        })
      ),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return null;

    const questions = await ctx.db
      .query("learning_quiz_questions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();

    return {
      _id: quiz._id,
      title: quiz.title,
      description: quiz.description,
      questionsCount: quiz.questionsCount,
      questions: questions.map((q: any) => ({
        _id: q._id,
        questionType: q.questionType,
        question: q.question,
        options: q.options,
        order: q.order,
        difficulty: q.difficulty,
      })),
    };
  },
});

// Submit quiz answers and auto-mark
export const submitQuizAnswers = mutation({
  args: {
    userId: v.id("users"),
    quizId: v.id("learning_quizzes"),
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    answers: v.array(
      v.object({
        questionId: v.id("learning_quiz_questions"),
        answer: v.union(v.number(), v.array(v.number())),
      })
    ),
  },
  returns: v.object({
    attemptId: v.id("learning_quiz_attempts"),
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    passed: v.boolean(),
    feedback: v.array(
      v.object({
        questionId: v.id("learning_quiz_questions"),
        isCorrect: v.boolean(),
        explanation: v.string(),
      })
    ),
  }),
  async handler(ctx, args) {
    // Get all questions
    const questions = await ctx.db
      .query("learning_quiz_questions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();

    let correctCount = 0;
    const feedback = [];

    // Score each answer
    for (const answer of args.answers) {
      const question = questions.find((q: any) => q._id === answer.questionId);
      if (!question) continue;

      let isCorrect = false;

      // Check answer based on question type
      if (
        question.questionType === "multiple_choice" ||
        question.questionType === "true_false"
      ) {
        isCorrect = answer.answer === question.correctAnswer;
      } else if (question.questionType === "multiple_answer") {
        // For multiple answer, check if all correct answers are selected
        const answerArray = Array.isArray(answer.answer) ? answer.answer : [answer.answer];
        const correctArray = Array.isArray(question.correctAnswer)
          ? question.correctAnswer
          : [question.correctAnswer];
        isCorrect =
          answerArray.length === correctArray.length &&
          answerArray.every((a: any) => correctArray.includes(a));
      }

      if (isCorrect) correctCount++;

      feedback.push({
        questionId: answer.questionId,
        isCorrect,
        explanation: question.explanation,
      });
    }

    // Calculate score
    const totalQuestions = questions.length;
    const score = Math.round((correctCount / totalQuestions) * 100);
    const passed = score >= 70; // 70% passing score

    // Save attempt
    const attemptId = await ctx.db.insert("learning_quiz_attempts", {
      userId: args.userId,
      quizId: args.quizId,
      lessonId: args.lessonId,
      learningRequestId: args.learningRequestId,
      score,
      totalQuestions,
      correctAnswers: correctCount,
      completedAt: Date.now(),
    });

    return {
      attemptId,
      score,
      totalQuestions,
      correctAnswers: correctCount,
      passed,
      feedback,
    };
  },
});

// Get quiz history for a lesson
export const getLessonQuizHistory = query({
  args: {
    userId: v.id("users"),
    lessonId: v.id("learning_lessons"),
  },
  returns: v.array(
    v.object({
      _id: v.id("learning_quiz_attempts"),
      score: v.number(),
      completedAt: v.number(),
      passed: v.boolean(),
    })
  ),
  async handler(ctx, args) {
    const attempts = await ctx.db
      .query("learning_quiz_attempts")
      .withIndex("by_user_lesson", (q: any) =>
        q.eq("userId", args.userId).eq("lessonId", args.lessonId)
      )
      .collect();

    return attempts
      .sort((a: any, b: any) => b.completedAt - a.completedAt)
      .map((a: any) => ({
        _id: a._id,
        score: a.score,
        completedAt: a.completedAt,
        passed: a.score >= 70,
      }));
  },
});

// Get previously asked questions to avoid repetition
export const getPreviouslyAskedQuestions = query({
  args: {
    learningRequestId: v.id("learningRequests"),
    lessonId: v.optional(v.id("learning_lessons")),
  },
  returns: v.array(v.string()),
  async handler(ctx, args) {
    let query = ctx.db
      .query("learning_question_history")
      .withIndex("by_learning_request", (q: any) =>
        q.eq("learningRequestId", args.learningRequestId)
      );

    const history = await query.collect();

    if (args.lessonId) {
      return history
        .filter((h: any) => h.lessonId === args.lessonId)
        .map((h: any) => h.questionText);
    }

    return history.map((h: any) => h.questionText);
  },
});
