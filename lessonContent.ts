import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Save AI-generated lesson content
export const saveLessonContent = mutation({
  args: {
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    title: v.string(),
    introduction: v.string(),
    objectives: v.array(v.string()),
    mainExplanation: v.string(),
    examples: v.array(v.object({
      title: v.string(),
      description: v.string(),
    })),
    practicalApplication: v.string(),
    keyPoints: v.array(v.string()),
    knowledgeCheck: v.object({
      question: v.string(),
      options: v.array(v.string()),
      correctAnswer: v.number(),
      explanation: v.string(),
    }),
  },
  returns: v.id("lesson_content"),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("lesson_content")
      .withIndex("by_lesson", (q: any) => q.eq("lessonId", args.lessonId))
      .first();

    const lessonContent = {
      lessonId: args.lessonId,
      learningRequestId: args.learningRequestId,
      title: args.title,
      introduction: args.introduction,
      objectives: args.objectives,
      mainExplanation: args.mainExplanation,
      examples: args.examples,
      practicalApplication: args.practicalApplication,
      keyPoints: args.keyPoints,
      knowledgeCheck: args.knowledgeCheck,
      generatedAt: Date.now(),
    };

    if (existing) {
      await ctx.db.patch(existing._id, lessonContent);
      return existing._id;
    }

    return await ctx.db.insert("lesson_content", lessonContent);
  },
});

export const createLessonProgress = mutation({
  args: {
    userId: v.id("users"),
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
  },
  returns: v.id("lesson_progress"),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("lesson_progress")
      .withIndex("by_user_lesson", (q: any) => q.eq("userId", args.userId).eq("lessonId", args.lessonId))
      .first();

    if (existing) return existing._id;

    return await ctx.db.insert("lesson_progress", {
      userId: args.userId,
      lessonId: args.lessonId,
      learningRequestId: args.learningRequestId,
      startedAt: Date.now(),
      isCompleted: false,
      currentSection: "introduction",
      timeSpentMinutes: 0,
      lastAccessedAt: Date.now(),
    });
  },
});

// Get lesson content with progress
export const getLessonWithProgress = query({
  args: {
    userId: v.id("users"),
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const lesson = await ctx.db.get(args.lessonId);
    if (!lesson) throw new Error("Lesson not found");

    const content = await ctx.db
      .query("lesson_content")
      .withIndex("by_lesson", (q: any) => q.eq("lessonId", args.lessonId))
      .first();

    const progress = await ctx.db
      .query("lesson_progress")
      .withIndex("by_user_lesson", (q: any) => q.eq("userId", args.userId).eq("lessonId", args.lessonId))
      .first();

    return {
      lesson,
      content,
      progress,
    };
  },
});

// Update lesson progress
export const updateLessonProgress = mutation({
  args: {
    progressId: v.id("lesson_progress"),
    currentSection: v.string(),
    timeSpentMinutes: v.number(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    await ctx.db.patch(args.progressId, {
      currentSection: args.currentSection,
      timeSpentMinutes: args.timeSpentMinutes,
      lastAccessedAt: Date.now(),
    });
  },
});

// Mark lesson as completed
export const markLessonCompleted = mutation({
  args: {
    progressId: v.id("lesson_progress"),
    knowledgeCheckCorrect: v.boolean(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    await ctx.db.patch(args.progressId, {
      isCompleted: true,
      completedAt: Date.now(),
      currentSection: "completed",
      knowledgeCheckAnswered: true,
      knowledgeCheckCorrect: args.knowledgeCheckCorrect,
    });
  },
});

// Get learning request with all lessons and progress
export const getLearningRequestWithLessons = query({
  args: {
    userId: v.id("users"),
    learningRequestId: v.id("learningRequests"),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const request = await ctx.db.get(args.learningRequestId);
    if (!request) throw new Error("Learning request not found");

    const modules = await ctx.db
      .query("learning_modules")
      .withIndex("by_learning_request", (q: any) => q.eq("learningRequestId", args.learningRequestId))
      .collect();

    const modulesWithLessons = await Promise.all(
      modules.map(async (module: any) => {
        const lessons = await ctx.db
          .query("learning_lessons")
          .withIndex("by_module", (q: any) => q.eq("moduleId", module._id))
          .collect();

        const lessonsWithProgress = await Promise.all(
          lessons.map(async (lesson: any) => {
            const progress = await ctx.db
              .query("lesson_progress")
              .withIndex("by_user_lesson", (q: any) => q.eq("userId", args.userId).eq("lessonId", lesson._id))
              .first();

            return {
              _id: lesson._id,
              title: lesson.title,
              order: lesson.order,
              estimatedDurationMinutes: lesson.estimatedDurationMinutes,
              progress,
            };
          })
        );

        return {
          _id: module._id,
          title: module.title,
          order: module.order,
          estimatedDurationMinutes: module.estimatedDurationMinutes,
          lessons: lessonsWithProgress,
        };
      })
    );

    const allLessons = modulesWithLessons.flatMap((m: any) => m.lessons);
    const totalLessons = allLessons.length;
    const completedLessons = allLessons.filter((l: any) => l.progress?.isCompleted).length;
    const completionPercentage = totalLessons > 0 ? Math.round((completedLessons / totalLessons) * 100) : 0;

    return {
      request,
      modules: modulesWithLessons,
      totalLessons,
      completedLessons,
      completionPercentage,
    };
  },
});