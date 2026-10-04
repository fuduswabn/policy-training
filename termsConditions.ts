import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Create new terms and conditions version
export const createTermsVersion = mutation({
  args: {
    type: v.union(
      v.literal("terms"),
      v.literal("privacy"),
      v.literal("acceptable_use"),
      v.literal("data_protection")
    ),
    title: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
    effectiveDate: v.number(),
    userId: v.id("users"),
  },
  returns: v.id("termsAndConditions"),
  handler: async (ctx, args) => {
    // Deactivate previous version of this type
    const previousVersions = await ctx.db
      .query("termsAndConditions")
      .withIndex("by_type_active", (q) =>
        q.eq("type", args.type).eq("isActive", true)
      )
      .collect();

    for (const prev of previousVersions) {
      await ctx.db.patch(prev._id, { isActive: false });
    }

    // Get highest version number for this type
    const allVersions = await ctx.db
      .query("termsAndConditions")
      .withIndex("by_type_version", (q) => q.eq("type", args.type))
      .collect();

    const maxVersion = allVersions.length > 0
      ? Math.max(...allVersions.map((t) => t.version))
      : 0;

    // Create new version
    return await ctx.db.insert("termsAndConditions", {
      type: args.type,
      version: maxVersion + 1,
      title: args.title,
      content: args.content,
      summary: args.summary,
      effectiveDate: args.effectiveDate,
      isActive: true,
      createdBy: args.userId,
      createdAt: Date.now(),
    });
  },
});

// Get active terms and conditions
export const getActiveTerms = query({
  args: {
    type: v.union(
      v.literal("terms"),
      v.literal("privacy"),
      v.literal("acceptable_use"),
      v.literal("data_protection")
    ),
  },
  returns: v.optional(v.object({
    _id: v.id("termsAndConditions"),
    type: v.string(),
    version: v.number(),
    title: v.string(),
    content: v.string(),
    summary: v.optional(v.string()),
    effectiveDate: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const result = await ctx.db
      .query("termsAndConditions")
      .withIndex("by_type_active", (q) =>
        q.eq("type", args.type).eq("isActive", true)
      )
      .first();

    if (!result) return undefined;

    return {
      _id: result._id,
      type: result.type,
      version: result.version,
      title: result.title,
      content: result.content,
      summary: result.summary,
      effectiveDate: result.effectiveDate,
      createdAt: result.createdAt,
    };
  },
});

// Get all versions of a specific terms type
export const getAllTermsVersions = query({
  args: {
    type: v.union(
      v.literal("terms"),
      v.literal("privacy"),
      v.literal("acceptable_use"),
      v.literal("data_protection")
    ),
  },
  returns: v.array(v.object({
    _id: v.id("termsAndConditions"),
    version: v.number(),
    title: v.string(),
    isActive: v.boolean(),
    effectiveDate: v.number(),
    createdAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const versions = await ctx.db
      .query("termsAndConditions")
      .withIndex("by_type_version", (q) => q.eq("type", args.type))
      .collect();

    return versions
      .sort((a, b) => b.version - a.version)
      .map((v) => ({
        _id: v._id,
        version: v.version,
        title: v.title,
        isActive: v.isActive,
        effectiveDate: v.effectiveDate,
        createdAt: v.createdAt,
      }));
  },
});

// Record user acknowledgment of terms
export const acknowledgeTerms = mutation({
  args: {
    userId: v.id("users"),
    termsId: v.id("termsAndConditions"),
    ipAddress: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
  },
  returns: v.id("termsAcknowledgments"),
  handler: async (ctx, args) => {
    // Get the terms to find version
    const terms = await ctx.db.get(args.termsId);
    if (!terms) {
      throw new Error("Terms not found");
    }

    // Check if user already acknowledged this version
    const existing = await ctx.db
      .query("termsAcknowledgments")
      .withIndex("by_user_and_terms", (q) =>
        q.eq("userId", args.userId).eq("termsId", args.termsId)
      )
      .first();

    if (existing) {
      return existing._id; // Already acknowledged
    }

    // Create new acknowledgment
    return await ctx.db.insert("termsAcknowledgments", {
      userId: args.userId,
      termsId: args.termsId,
      versionAccepted: terms.version,
      ipAddress: args.ipAddress,
      deviceInfo: args.deviceInfo,
      acknowledgedAt: Date.now(),
    });
  },
});

// Check if user has acknowledged specific terms type
export const hasUserAcknowledgedTerms = query({
  args: {
    userId: v.id("users"),
    type: v.union(
      v.literal("terms"),
      v.literal("privacy"),
      v.literal("acceptable_use"),
      v.literal("data_protection")
    ),
  },
  returns: v.boolean(),
  handler: async (ctx, args) => {
    // Get active terms
    const activeTerms = await ctx.db
      .query("termsAndConditions")
      .withIndex("by_type_active", (q) =>
        q.eq("type", args.type).eq("isActive", true)
      )
      .first();

    if (!activeTerms) return true; // No terms published yet

    // Check if user acknowledged this version
    const acknowledgment = await ctx.db
      .query("termsAcknowledgments")
      .withIndex("by_user_and_terms", (q) =>
        q.eq("userId", args.userId).eq("termsId", activeTerms._id)
      )
      .first();

    return !!acknowledgment;
  },
});

// Get user's acknowledgment history
export const getUserTermsHistory = query({
  args: { userId: v.id("users") },
  returns: v.array(v.object({
    type: v.string(),
    version: v.number(),
    title: v.string(),
    acknowledgedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const acknowledgments = await ctx.db
      .query("termsAcknowledgments")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const results = [];
    for (const ack of acknowledgments) {
      const terms = await ctx.db.get(ack.termsId);
      if (terms) {
        results.push({
          type: terms.type,
          version: terms.version,
          title: terms.title,
          acknowledgedAt: ack.acknowledgedAt,
        });
      }
    }

    return results.sort((a, b) => b.acknowledgedAt - a.acknowledgedAt);
  },
});
