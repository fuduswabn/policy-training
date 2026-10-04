import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

// Create a new learning request
export const createLearningRequest = mutation({
  args: {
    userId: v.id("users"),
    skill: v.string(),
    reason: v.string(),
    experienceLevel: v.union(
      v.literal("beginner"),
      v.literal("some_experience"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    availableTime: v.union(
      v.literal("10_minutes"),
      v.literal("20_minutes"),
      v.literal("30_minutes"),
      v.literal("60_minutes")
    ),
    learningGoal: v.string(),
  },
  returns: v.id("learningRequests"),
  handler: async (ctx, args) => {
    const userDoc = await ctx.db.get(args.userId);

    if (!userDoc) throw new Error("User not found");

    const now = Date.now();
    const id = await ctx.db.insert("learningRequests", {
      userId: args.userId,
      companyId: userDoc.companyId!,
      skill: args.skill,
      reason: args.reason,
      experienceLevel: args.experienceLevel,
      availableTime: args.availableTime,
      learningGoal: args.learningGoal,
      status: "requested",
      createdAt: now,
      updatedAt: now,
    });

    return id;
  },
});

// Get learning requests for current user
export const getUserLearningRequests = query({
  args: { userId: v.id("users") },
  async handler(ctx, args) {
    const userDoc = await ctx.db.get(args.userId);
    if (!userDoc) return [];

    const requests = await ctx.db
      .query("learningRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return requests;
  },
});

// Get learning requests by status
export const getUserLearningRequestsByStatus = query({
  args: {
    userId: v.id("users"),
    status: v.union(
      v.literal("requested"),
      v.literal("generating"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
  },
  returns: v.array(v.object({
    _id: v.id("learningRequests"),
    skill: v.string(),
    reason: v.string(),
    experienceLevel: v.string(),
    availableTime: v.string(),
    learningGoal: v.string(),
    status: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const requests = await ctx.db
      .query("learningRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    return requests
      .filter(r => r.status === args.status)
      .map(r => (
      {
        _id: r._id,
        skill: r.skill,
        reason: r.reason,
        experienceLevel: r.experienceLevel,
        availableTime: r.availableTime,
        learningGoal: r.learningGoal,
        status: r.status,
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
      }
    ));
  },
});

// Cancel a learning request
export const cancelLearningRequest = mutation({
  args: {
    userId: v.id("users"),
    requestId: v.id("learningRequests"),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    // Verify user owns this request
    if (request.userId !== args.userId) {
      throw new Error("Unauthorized");
    }

    await ctx.db.patch(args.requestId, {
      status: "cancelled",
      updatedAt: Date.now(),
    });
  },
});