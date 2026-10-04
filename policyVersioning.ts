import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCompanyManager } from "./security";

// Create a new version of an existing policy or initial policy
export const createPolicyVersion = mutation({
  args: {
    policyId: v.optional(v.id("policies")), // null for new policy, id for creating new version
    companyId: v.id("companies"),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx"), v.literal("txt")),
    fileUrl: v.string(),
    uploadedBy: v.id("users"),
    policyType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    status: v.union(v.literal("draft"), v.literal("active"), v.literal("archived")),
    effectiveDate: v.optional(v.number()),
    reviewDate: v.optional(v.number()),
    requiresTraining: v.optional(v.boolean()),
    requiresAcknowledgement: v.optional(v.boolean()),
  },
  returns: v.object({
    policyId: v.id("policies"),
    version: v.number(),
    status: v.string(),
  }),
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.uploadedBy, args.companyId);

    let policy: any;
    let newVersion = 1;

    if (args.policyId) {
      // Creating a new version of existing policy
      policy = await ctx.db.get(args.policyId);
      if (!policy) throw new Error("Policy not found");
      if (policy.companyId.toString() !== args.companyId.toString()) {
        throw new Error("Unauthorized");
      }

      // Get the latest version number for this policy
      const versions = await ctx.db
        .query("policyVersions")
        .withIndex("by_policy", (q: any) => q.eq("policyId", args.policyId))
        .order("desc")
        .take(1);
      
      newVersion = versions.length > 0 ? versions[0].versionNumber + 1 : 2;

      // Deactivate previous version if creating active version
      if (args.status === "active") {
        await ctx.db.patch(args.policyId, { isActive: false });
      }
    } else {
      // Creating entirely new policy
      const newPolicyId = await ctx.db.insert("policies", {
        title: args.title,
        description: args.description,
        content: args.content,
        fileType: args.fileType,
        fileUrl: args.fileUrl,
        companyId: args.companyId,
        uploadedBy: args.uploadedBy,
        policyType: args.policyType,
        targetGroupIds: args.targetGroupIds,
        version: 1,
        isActive: args.status === "active",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      // Chunk the policy for AI processing
      const chunkSize = 500;
      const chunks = [];
      for (let i = 0; i < args.content.length; i += chunkSize) {
        chunks.push(args.content.substring(i, i + chunkSize));
      }

      for (let i = 0; i < chunks.length; i++) {
        await ctx.db.insert("policyChunks", {
          policyId: newPolicyId,
          chunkIndex: i,
          content: chunks[i],
          createdAt: Date.now(),
        });
      }

      policy = {
        _id: newPolicyId,
        companyId: args.companyId,
      };
    }

    // Create version record
    await ctx.db.insert("policyVersions", {
      policyId: policy._id,
      versionNumber: newVersion,
      title: args.title,
      description: args.description,
      content: args.content,
      fileUrl: args.fileUrl,
      uploadedBy: args.uploadedBy,
      status: args.status,
      effectiveDate: args.effectiveDate,
      reviewDate: args.reviewDate,
      requiresTraining: args.requiresTraining || false,
      requiresAcknowledgement: args.requiresAcknowledgement || true,
      createdAt: Date.now(),
    });

    // If active, update policy record
    if (args.status === "active") {
      await ctx.db.patch(policy._id, {
        title: args.title,
        description: args.description,
        content: args.content,
        fileUrl: args.fileUrl,
        version: newVersion,
        isActive: true,
        updatedAt: Date.now(),
      });

      // If requires acknowledgement, create/update acknowledgment records
      if (args.requiresAcknowledgement) {
        const employees = await ctx.db
          .query("users")
          .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
          .collect();

        for (const employee of employees) {
          if (employee.role !== "employee") continue;

          // For group policies, only create for employees in target groups
          if (args.policyType === "group" && args.targetGroupIds) {
            const employeeGroups = employee.groupIds || [];
            const isInGroup = args.targetGroupIds.some((gId: any) =>
              employeeGroups.includes(gId)
            );
            if (!isInGroup) continue;
          }

          // Mark previous acknowledgements as requiring retake for new version
          const existing = await ctx.db
            .query("policyAcknowledgments")
            .withIndex("by_employee_policy", (q: any) =>
              q.eq("employeeId", employee._id).eq("policyId", policy._id)
            )
            .first();

          if (existing) {
            await ctx.db.patch(existing._id, {
              acknowledged: false,
              requiresRetake: true,
              acknowledgedAt: undefined,
            });
          } else {
            await ctx.db.insert("policyAcknowledgments", {
              employeeId: employee._id,
              policyId: policy._id,
              acknowledged: false,
              requiresRetake: false,
            });
          }
        }
      }
    }

    return {
      policyId: policy._id,
      version: newVersion,
      status: args.status,
    };
  },
});

// Get policy version history
export const getPolicyVersionHistory = query({
  args: {
    policyId: v.id("policies"),
    userId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("policyVersions"),
      versionNumber: v.number(),
      title: v.string(),
      status: v.string(),
      uploadedBy: v.id("users"),
      effectiveDate: v.optional(v.number()),
      reviewDate: v.optional(v.number()),
      requiresTraining: v.boolean(),
      requiresAcknowledgement: v.boolean(),
      createdAt: v.number(),
    })
  ),
  async handler(ctx, args) {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) return [];

    const versions = await ctx.db
      .query("policyVersions")
      .withIndex("by_policy", (q: any) => q.eq("policyId", args.policyId))
      .order("desc")
      .collect();

    return versions.map((v: any) => ({
      _id: v._id,
      versionNumber: v.versionNumber,
      title: v.title,
      status: v.status,
      uploadedBy: v.uploadedBy,
      effectiveDate: v.effectiveDate,
      reviewDate: v.reviewDate,
      requiresTraining: v.requiresTraining,
      requiresAcknowledgement: v.requiresAcknowledgement,
      createdAt: v.createdAt,
    }));
  },
});

// Get specific policy version
export const getPolicyVersion = query({
  args: {
    policyVersionId: v.id("policyVersions"),
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("policyVersions"),
      policyId: v.id("policies"),
      versionNumber: v.number(),
      title: v.string(),
      description: v.optional(v.string()),
      content: v.string(),
      status: v.string(),
      uploadedBy: v.id("users"),
      effectiveDate: v.optional(v.number()),
      reviewDate: v.optional(v.number()),
      requiresTraining: v.boolean(),
      requiresAcknowledgement: v.boolean(),
      createdAt: v.number(),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const version = await ctx.db.get(args.policyVersionId);
    if (!version) return null;

    return {
      _id: version._id,
      policyId: version.policyId,
      versionNumber: version.versionNumber,
      title: version.title,
      description: version.description,
      content: version.content,
      status: version.status,
      uploadedBy: version.uploadedBy,
      effectiveDate: version.effectiveDate,
      reviewDate: version.reviewDate,
      requiresTraining: version.requiresTraining,
      requiresAcknowledgement: version.requiresAcknowledgement,
      createdAt: version.createdAt,
    };
  },
});

// Archive a policy (old versions stay in history)
export const archivePolicy = mutation({
  args: {
    policyId: v.id("policies"),
    userId: v.id("users"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const policy = await ctx.db.get(args.policyId);
    if (!policy) throw new Error("Policy not found");

    await requireCompanyManager(ctx, args.userId, policy.companyId);

    await ctx.db.patch(args.policyId, {
      isActive: false,
      updatedAt: Date.now(),
    });

    // Mark current version as archived
    const currentVersion = await ctx.db
      .query("policyVersions")
      .withIndex("by_policy", (q: any) => q.eq("policyId", args.policyId))
      .order("desc")
      .take(1)
      .first();

    if (currentVersion) {
      await ctx.db.patch(currentVersion._id, {
        status: "archived",
      });
    }

    return null;
  },
});
