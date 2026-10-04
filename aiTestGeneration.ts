import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";

// ─────────────────────────────────────────────────────────────
// AI TEST GENERATION IMPROVEMENTS - FORMALIZATION
// ─────────────────────────────────────────────────────────────

// DIFFICULTY LEVELS - ADAPTIVE TESTING
const DIFFICULTY_LEVELS = {
  easy: { range: [0, 40], label: "Easy" },
  medium: { range: [40, 70], label: "Medium" },
  hard: { range: [70, 100], label: "Hard" },
} as const;

type DifficultyLevel = keyof typeof DIFFICULTY_LEVELS;

// Helper: Calculate adaptive difficulty based on employee performance
export const calculateAdaptiveDifficulty = internalQuery({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
  async handler(ctx, args) {
    // Get employee's recent quiz attempts (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffTime = sevenDaysAgo.getTime();

    const recentAttempts = await ctx.db
      .query("dailyQuizAttempts")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    const weekAttempts = recentAttempts.filter(
      (a: any) => a.completedAt >= cutoffTime
    );

    if (weekAttempts.length === 0) {
      return "easy"; // Start with easy for new employees
    }

    // Calculate average score
    const avgScore =
      weekAttempts.reduce((sum: number, a: any) => sum + a.score, 0) /
      weekAttempts.length;

    // Adaptive logic
    if (avgScore >= 80) return "hard"; // Performing well, increase difficulty
    if (avgScore >= 60) return "medium"; // Average performance
    return "easy"; // Struggling, use easier questions
  },
});

// ─────────────────────────────────────────────────────────────
// WEAK TOPIC IDENTIFICATION
// ─────────────────────────────────────────────────────────────

export const identifyWeakTopics = internalQuery({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.array(
    v.object({
      category: v.string(),
      weaknessScore: v.number(), // 0-100, higher = weaker
      recommendedFocusArea: v.string(),
      failureCount: v.number(),
    })
  ),
  async handler(ctx, args) {
    // Get all quiz attempts for this user
    const attempts = await ctx.db
      .query("dailyQuizAttempts")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    if (attempts.length === 0) {
      return []; // No data yet
    }

    // Group by category (from policyRef or question history)
    const categoryPerformance: Record<
      string,
      { correct: number; total: number }
    > = {};

    for (const attempt of attempts) {
      // Note: This requires linking back through questions to get category
      // For now, we'll flag this as needing implementation
    }

    // Calculate weakness scores (where 100 = completely failed)
    const weakTopics = Object.entries(categoryPerformance)
      .map(([category, performance]) => {
        const successRate = performance.correct / performance.total;
        const weaknessScore = Math.round((1 - successRate) * 100);
        const failureCount = performance.total - performance.correct;

        return {
          category,
          weaknessScore,
          recommendedFocusArea: `Focus on "${category}" - you've answered incorrectly ${failureCount} times`,
          failureCount,
        };
      })
      .filter((topic) => topic.weaknessScore >= 30) // Only flag significant weaknesses
      .sort((a, b) => b.weaknessScore - a.weaknessScore);

    return weakTopics;
  },
});

// ─────────────────────────────────────────────────────────────
// AI GENERATION LOGGING & AUDIT TRAIL
// ─────────────────────────────────────────────────────────────

export const logAIGeneration = internalMutation({
  args: {
    companyId: v.id("companies"),
    policyId: v.id("policies"),
    policyVersionId: v.optional(v.id("policyVersions")),
    quizId: v.id("dailyQuizzes"),
    questionsGenerated: v.number(),
    questionsSuccessful: v.number(),
    questionsFailed: v.number(),
    generationMethod: v.union(v.literal("llm"), v.literal("fallback")),
    averageConfidence: v.number(),
    notes: v.optional(v.string()),
  },
  returns: v.id("aiGenerationLog"),
  async handler(ctx, args) {
    return await ctx.db.insert("aiGenerationLog", {
      companyId: args.companyId,
      policyId: args.policyId,
      policyVersionId: args.policyVersionId,
      quizId: args.quizId,
      questionsGenerated: args.questionsGenerated,
      questionsSuccessful: args.questionsSuccessful,
      questionsFailed: args.questionsFailed,
      generationMethod: args.generationMethod,
      averageConfidence: args.averageConfidence,
      notes: args.notes,
      generatedAt: Date.now(),
    });
  },
});

// Public query: Get AI generation history for HR dashboard
export const getAIGenerationHistory = query({
  args: {
    companyId: v.id("companies"),
    limit: v.optional(v.number()),
  },
  returns: v.array(
    v.object({
      _id: v.id("aiGenerationLog"),
      dateGenerated: v.number(),
      policyTitle: v.string(),
      questionsGenerated: v.number(),
      questionsSuccessful: v.number(),
      questionsFailed: v.number(),
      successRate: v.number(),
      generationMethod: v.string(),
      averageConfidence: v.number(),
    })
  ),
  async handler(ctx, args) {
    const logs = await ctx.db
      .query("aiGenerationLog")
      .withIndex("by_company_date", (q: any) =>
        q.eq("companyId", args.companyId)
      )
      .order("desc")
      .take(args.limit || 30);

    return await Promise.all(
      logs.map(async (log: any) => {
        const policy = await ctx.db.get(log.policyId);
        return {
          _id: log._id,
          dateGenerated: log.generatedAt,
          policyTitle: policy?.title || "Unknown Policy",
          questionsGenerated: log.questionsGenerated,
          questionsSuccessful: log.questionsSuccessful,
          questionsFailed: log.questionsFailed,
          successRate: Math.round(
            (log.questionsSuccessful / log.questionsGenerated) * 100
          ),
          generationMethod: log.generationMethod,
          averageConfidence: log.averageConfidence,
        };
      })
    );
  },
});

// ─────────────────────────────────────────────────────────────
// EMPLOYEE PERFORMANCE ANALYTICS
// ─────────────────────────────────────────────────────────────

export const getEmployeePerformanceAnalytics = query({
  args: {
    employeeId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.object({
    overallScore: v.number(), // Average score across all attempts
    totalAttempts: v.number(),
    passedTests: v.number(),
    failedTests: v.number(),
    passRate: v.number(),
    weeklyAverage: v.number(),
    trendingUp: v.boolean(),
    weakAreas: v.array(
      v.object({
        category: v.string(),
        performanceScore: v.number(),
      })
    ),
    lastAttemptDate: v.optional(v.number()),
    daysInactive: v.optional(v.number()),
  }),
  async handler(ctx, args) {
    const allAttempts = await ctx.db
      .query("dailyQuizAttempts")
      .withIndex("by_user", (q: any) => q.eq("userId", args.employeeId))
      .collect();

    if (allAttempts.length === 0) {
      return {
        overallScore: 0,
        totalAttempts: 0,
        passedTests: 0,
        failedTests: 0,
        passRate: 0,
        weeklyAverage: 0,
        trendingUp: false,
        weakAreas: [],
        lastAttemptDate: undefined,
        daysInactive: undefined,
      };
    }

    // Calculate metrics
    const passedTests = allAttempts.filter(
      (a: any) => a.passed === true || a.score >= 70
    ).length;
    const failedTests = allAttempts.length - passedTests;
    const overallScore = Math.round(
      allAttempts.reduce((sum: number, a: any) => sum + a.score, 0) /
        allAttempts.length
    );
    const passRate = Math.round((passedTests / allAttempts.length) * 100);

    // Weekly average
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const weeklyAttempts = allAttempts.filter(
      (a: any) => a.completedAt >= sevenDaysAgo
    );
    const weeklyAverage =
      weeklyAttempts.length > 0
        ? Math.round(
            weeklyAttempts.reduce((sum: number, a: any) => sum + a.score, 0) /
              weeklyAttempts.length
          )
        : 0;

    // Trending (compare first half vs second half of attempts)
    let trendingUp = false;
    if (allAttempts.length >= 4) {
      const mid = Math.floor(allAttempts.length / 2);
      const firstHalf = allAttempts.slice(0, mid);
      const secondHalf = allAttempts.slice(mid);
      const firstAvg =
        firstHalf.reduce((sum: number, a: any) => sum + a.score, 0) /
        firstHalf.length;
      const secondAvg =
        secondHalf.reduce((sum: number, a: any) => sum + a.score, 0) /
        secondHalf.length;
      trendingUp = secondAvg > firstAvg;
    }

    // Days inactive
    const lastAttempt = allAttempts[allAttempts.length - 1];
    const lastAttemptDate = lastAttempt?.completedAt;
    const daysInactive = lastAttemptDate
      ? Math.floor((Date.now() - lastAttemptDate) / (24 * 60 * 60 * 1000))
      : undefined;

    return {
      overallScore,
      totalAttempts: allAttempts.length,
      passedTests,
      failedTests,
      passRate,
      weeklyAverage,
      trendingUp,
      weakAreas: [], // TODO: implement category-based weak area detection
      lastAttemptDate,
      daysInactive,
    };
  },
});

// ─────────────────────────────────────────────────────────────
// HR CONFIGURATION & CONTROLS
// ─────────────────────────────────────────────────────────────

export const configureAITesting = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    enabled: v.boolean(),
    questionsPerDay: v.number(),
    passingScore: v.number(),
    scheduledTime: v.optional(v.number()), // Hour of day (0-23)
    trainingSchedule: v.optional(v.string()), // "daily", "weekday", "weekly"
  },
  returns: v.id("testGenerationConfig"),
  async handler(ctx, args) {
    // Check if config already exists
    const existing = await ctx.db
      .query("testGenerationConfig")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        enabled: args.enabled,
        questionsPerDay: args.questionsPerDay,
        passingScore: args.passingScore,
        scheduledTime: args.scheduledTime,
        trainingSchedule: args.trainingSchedule,
        updatedAt: Date.now(),
        updatedBy: args.userId,
      });
      return existing._id;
    }

    return await ctx.db.insert("testGenerationConfig", {
      companyId: args.companyId,
      enabled: args.enabled,
      questionsPerDay: args.questionsPerDay,
      passingScore: args.passingScore,
      scheduledTime: args.scheduledTime,
      trainingSchedule: args.trainingSchedule,
      createdAt: Date.now(),
      createdBy: args.userId,
      updatedAt: Date.now(),
      updatedBy: args.userId,
    });
  },
});

// Get configuration
export const getTestGenerationConfig = query({
  args: { companyId: v.id("companies") },
  returns: v.optional(
    v.object({
      enabled: v.boolean(),
      questionsPerDay: v.number(),
      passingScore: v.number(),
      scheduledTime: v.optional(v.number()),
      trainingSchedule: v.optional(v.string()),
    })
  ),
  async handler(ctx, args) {
    const config = await ctx.db
      .query("testGenerationConfig")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .first();

    if (!config) return undefined;

    return {
      enabled: config.enabled,
      questionsPerDay: config.questionsPerDay,
      passingScore: config.passingScore,
      scheduledTime: config.scheduledTime,
      trainingSchedule: config.trainingSchedule,
    };
  },
});

// ─────────────────────────────────────────────────────────────
// QUESTION DIFFICULTY & VALIDATION
// ─────────────────────────────────────────────────────────────

export const saveQuestionWithDifficulty = internalMutation({
  args: {
    quizId: v.id("dailyQuizzes"),
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    explanation: v.string(),
    category: v.string(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    sourcePolicyTitle: v.optional(v.string()),
    sourceContent: v.optional(v.string()),
    confidence: v.number(),
  },
  returns: v.id("dailyQuizQuestions"),
  async handler(ctx, args) {
    return await ctx.db.insert("dailyQuizQuestions", {
      quizId: args.quizId,
      question: args.question,
      options: args.options,
      correctAnswer: args.correctAnswer,
      explanation: args.explanation,
      policyRef: args.sourcePolicyTitle,
      order: 0, // Will be set when finalizing
      difficulty: args.difficulty,
      sourceContent: args.sourceContent,
      confidence: args.confidence,
      requiresValidation: args.confidence < 70,
      createdAt: Date.now(),
    });
  },
});

// HR review and validate questions
export const validateAIQuestion = mutation({
  args: {
    questionId: v.id("dailyQuizQuestions"),
    companyId: v.id("companies"),
    userId: v.id("users"),
    approved: v.boolean(),
    notes: v.optional(v.string()),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new Error("Question not found");

    await ctx.db.patch(args.questionId, {
      requiresValidation: false,
      validatedBy: args.userId,
      validatedAt: Date.now(),
      approved: args.approved,
      validationNotes: args.notes,
    });

    return null;
  },
});

