import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCompanyManager } from "./security";

// ─────────────────────────────────────────────────────────────
// POLICY ASSIGNMENT MANAGEMENT
// ─────────────────────────────────────────────────────────────

export const assignPolicyToDepartment = mutation({
  args: {
    policyId: v.id("policies"),
    departmentId: v.id("departments"),
    companyId: v.id("companies"),
    requiresTraining: v.boolean(),
    requiresAcknowledgement: v.boolean(),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.userId, args.companyId, ["manager", "hr_manager", "admin"]);

    const existing = await ctx.db
      .query("policyAssignments")
      .filter((q: any) => q.eq(q.field("policyId"), args.policyId))
      .filter((q: any) => q.eq(q.field("departmentId"), args.departmentId))
      .filter((q: any) => q.eq(q.field("type"), "department"))
      .first();

    if (existing) {
      throw new Error("Policy already assigned to this department");
    }

    return await ctx.db.insert("policyAssignments", {
      companyId: args.companyId,
      policyId: args.policyId,
      type: "department",
      targetId: args.departmentId,
      departmentId: args.departmentId,
      requiresTraining: args.requiresTraining,
      requiresAcknowledgement: args.requiresAcknowledgement,
      createdAt: Date.now(),
      createdBy: args.userId,
    });
  },
});

export const assignPolicyToSite = mutation({
  args: {
    policyId: v.id("policies"),
    siteId: v.id("sites"),
    companyId: v.id("companies"),
    requiresTraining: v.boolean(),
    requiresAcknowledgement: v.boolean(),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.userId, args.companyId, ["manager", "hr_manager", "admin"]);

    return await ctx.db.insert("policyAssignments", {
      companyId: args.companyId,
      policyId: args.policyId,
      type: "site",
      targetId: args.siteId,
      siteId: args.siteId,
      requiresTraining: args.requiresTraining,
      requiresAcknowledgement: args.requiresAcknowledgement,
      createdAt: Date.now(),
      createdBy: args.userId,
    });
  },
});

export const assignPolicyToEmployee = mutation({
  args: {
    policyId: v.id("policies"),
    employeeId: v.id("users"),
    companyId: v.id("companies"),
    requiresTraining: v.boolean(),
    requiresAcknowledgement: v.boolean(),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.userId, args.companyId, ["manager", "hr_manager", "admin"]);

    return await ctx.db.insert("policyAssignments", {
      companyId: args.companyId,
      policyId: args.policyId,
      type: "employee",
      targetId: args.employeeId,
      employeeId: args.employeeId,
      requiresTraining: args.requiresTraining,
      requiresAcknowledgement: args.requiresAcknowledgement,
      createdAt: Date.now(),
      createdBy: args.userId,
    });
  },
});

export const getPolicyAssignments = query({
  args: {
    policyId: v.id("policies"),
    companyId: v.id("companies"),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("policyAssignments")
      .filter((q: any) => q.eq(q.field("companyId"), args.companyId))
      .filter((q: any) => q.eq(q.field("policyId"), args.policyId))
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────
// POLICY COMPLIANCE TRACKING
// ─────────────────────────────────────────────────────────────

export const getPolicyComplianceStatus = query({
  args: {
    policyId: v.id("policies"),
    companyId: v.id("companies"),
  },
  async handler(ctx, args) {
    const assignments = await ctx.db
      .query("policyAssignments")
      .filter((q: any) => q.eq(q.field("companyId"), args.companyId))
      .filter((q: any) => q.eq(q.field("policyId"), args.policyId))
      .collect();

    const compliance = await Promise.all(
      assignments.map(async (assignment: any) => {
        if (assignment.type === "department") {
          const employees = await ctx.db
            .query("employeeProfiles")
            .filter((q: any) => q.eq(q.field("departmentId"), assignment.departmentId))
            .collect();

          const acknowledgements = await ctx.db
            .query("policyAcknowledgments")
            .filter((q: any) => q.eq(q.field("policyId"), args.policyId))
            .collect();

          const acknowledged = acknowledgements.filter((a: any) => 
            employees.some((e: any) => e.userId === a.userId)
          );

          return {
            type: "department",
            department: assignment.departmentId,
            total: employees.length,
            acknowledged: acknowledged.length,
            pending: employees.length - acknowledged.length,
            compliance: employees.length > 0 ? Math.round((acknowledged.length / employees.length) * 100) : 0,
          };
        }

        if (assignment.type === "employee") {
          const ack = await ctx.db
            .query("policyAcknowledgments")
            .filter((q: any) => q.eq(q.field("policyId"), args.policyId))
            .filter((q: any) => q.eq(q.field("userId"), assignment.employeeId))
            .first();

          return {
            type: "employee",
            employee: assignment.employeeId,
            acknowledged: !!ack,
            acknowledgedAt: ack?.timestamp,
          };
        }

        return null;
      })
    );

    return compliance.filter((c: any) => c !== null);
  },
});

export const getEmployeePolicyCompliance = query({
  args: {
    employeeId: v.id("users"),
    companyId: v.id("companies"),
  },
  async handler(ctx, args) {
    const policies = await ctx.db
      .query("policies")
      .filter((q: any) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const compliance = await Promise.all(
      policies.map(async (policy: any) => {
        const ack = await ctx.db
          .query("policyAcknowledgments")
          .filter((q: any) => q.eq(q.field("policyId"), policy._id))
          .filter((q: any) => q.eq(q.field("userId"), args.employeeId))
          .first();

        return {
          policyId: policy._id,
          title: policy.title,
          acknowledged: !!ack,
          acknowledgedAt: ack?.timestamp,
          version: ack?.policyVersion || policy.version,
        };
      })
    );

    return compliance;
  },
});

// ─────────────────────────────────────────────────────────────
// AI QUESTION VALIDATION & REVIEW
// ─────────────────────────────────────────────────────────────

export const markAIQuestionForReview = mutation({
  args: {
    questionId: v.id("dailyQuizzes"),
    companyId: v.id("companies"),
    reason: v.string(),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.userId, args.companyId, ["manager", "hr_manager", "compliance_officer", "admin"]);

    const question = await ctx.db.get(args.questionId);
    if (!question) {
      throw new Error("Question not found");
    }

    return await ctx.db.insert("aiQuestionReviews", {
      companyId: args.companyId,
      questionId: args.questionId,
      reason: args.reason,
      status: "pending_review",
      createdAt: Date.now(),
      createdBy: args.userId,
      reviewedAt: null,
      reviewedBy: null,
      reviewNotes: null,
    });
  },
});

export const approveAIQuestion = mutation({
  args: {
    reviewId: v.id("aiQuestionReviews"),
    companyId: v.id("companies"),
    notes: v.optional(v.string()),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.userId, args.companyId, ["admin", "compliance_officer"]);

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    await ctx.db.patch(args.reviewId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: args.userId,
      reviewNotes: args.notes,
    });

    return { success: true };
  },
});

export const rejectAIQuestion = mutation({
  args: {
    reviewId: v.id("aiQuestionReviews"),
    companyId: v.id("companies"),
    rejectionReason: v.string(),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.userId, args.companyId, ["admin", "compliance_officer"]);

    const review = await ctx.db.get(args.reviewId);
    if (!review) {
      throw new Error("Review not found");
    }

    await ctx.db.patch(args.reviewId, {
      status: "rejected",
      reviewedAt: Date.now(),
      reviewedBy: args.userId,
      reviewNotes: args.rejectionReason,
    });

    // Flag the question as invalid in dailyQuizzes
    const question = await ctx.db.get(review.questionId);
    if (question) {
      await ctx.db.patch(review.questionId, {
        status: "rejected_by_compliance",
        complianceNotes: args.rejectionReason,
      });
    }

    return { success: true };
  },
});

export const getPendingAIReviews = query({
  args: {
    companyId: v.id("companies"),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("aiQuestionReviews")
      .filter((q: any) => q.eq(q.field("companyId"), args.companyId))
      .filter((q: any) => q.eq(q.field("status"), "pending_review"))
      .collect();
  },
});

// ─────────────────────────────────────────────────────────────
// POLICY TRAINING CONFIGURATION
// ─────────────────────────────────────────────────────────────

export const setPolicyTrainingConfig = mutation({
  args: {
    policyId: v.id("policies"),
    companyId: v.id("companies"),
    requiresTraining: v.boolean(),
    requiresAcknowledgement: v.boolean(),
    passingScore: v.number(),
    questionsPerDay: v.number(),
    trainingSchedule: v.object({
      startDate: v.number(),
      duration: v.number(), // in days
    }),
    userId: v.id("users"),
  },
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.userId, args.companyId, ["manager", "hr_manager", "admin"]);

    const config = await ctx.db
      .query("policyTrainingConfig")
      .filter((q: any) => q.eq(q.field("policyId"), args.policyId))
      .first();

    if (config) {
      await ctx.db.patch(config._id, {
        requiresTraining: args.requiresTraining,
        requiresAcknowledgement: args.requiresAcknowledgement,
        passingScore: args.passingScore,
        questionsPerDay: args.questionsPerDay,
        trainingSchedule: args.trainingSchedule,
        updatedAt: Date.now(),
        updatedBy: args.userId,
      });

      return config._id;
    }

    return await ctx.db.insert("policyTrainingConfig", {
      companyId: args.companyId,
      policyId: args.policyId,
      requiresTraining: args.requiresTraining,
      requiresAcknowledgement: args.requiresAcknowledgement,
      passingScore: args.passingScore,
      questionsPerDay: args.questionsPerDay,
      trainingSchedule: args.trainingSchedule,
      createdAt: Date.now(),
      createdBy: args.userId,
      updatedAt: Date.now(),
      updatedBy: args.userId,
    });
  },
});

export const getPolicyTrainingConfig = query({
  args: {
    policyId: v.id("policies"),
  },
  async handler(ctx, args) {
    return await ctx.db
      .query("policyTrainingConfig")
      .filter((q: any) => q.eq(q.field("policyId"), args.policyId))
      .first();
  },
});
