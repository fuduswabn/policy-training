import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Assign equipment to an employee
export const assignEquipment = mutation({
  args: {
    companyId: v.id("companies"),
    employeeId: v.id("users"),
    assetType: v.union(v.literal("vehicle"), v.literal("asset")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    templateId: v.id("inspectionTemplates"),
    inspectionFrequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("before_use")),
    inspectionRequirement: v.optional(v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("before_use"))),
    assignedBy: v.id("users"),
    notes: v.optional(v.string()),
  },
  returns: v.id("equipmentAssignments"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("equipmentAssignments", {
      companyId: args.companyId,
      employeeId: args.employeeId,
      assetType: args.assetType,
      vehicleId: args.vehicleId,
      assetId: args.assetId,
      templateId: args.templateId,
      inspectionRequirement: args.inspectionRequirement || args.inspectionFrequency,
      requiresDailyInspection: (args.inspectionRequirement || args.inspectionFrequency) === "daily",
      inspectionFrequency: args.inspectionFrequency,
      assignedDate: now,
      isActive: true,
      assignedBy: args.assignedBy,
      notes: args.notes,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get assignments for an employee
export const getEmployeeAssignments = query({
  args: {
    employeeId: v.id("users"),
  },
  returns: v.array(v.object({
    _id: v.id("equipmentAssignments"),
    assetType: v.string(),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    templateId: v.id("inspectionTemplates"),
    inspectionFrequency: v.string(),
    requiresDailyInspection: v.boolean(),
    isActive: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("equipmentAssignments")
      .withIndex("by_employee", (q) => q.eq("employeeId", args.employeeId))
      .collect();
    
    return assignments
      .filter(a => a.isActive)
      .map(a => ({
        _id: a._id,
        assetType: a.assetType,
        vehicleId: a.vehicleId,
        assetId: a.assetId,
        templateId: a.templateId,
        inspectionFrequency: a.inspectionFrequency,
        requiresDailyInspection: a.requiresDailyInspection,
        isActive: a.isActive,
      }));
  },
});

// Get all assignments for a company
export const getCompanyAssignments = query({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.array(v.object({
    _id: v.id("equipmentAssignments"),
    employeeId: v.id("users"),
    assetType: v.string(),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    templateId: v.id("inspectionTemplates"),
    inspectionFrequency: v.string(),
    isActive: v.boolean(),
  })),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("equipmentAssignments")
      .withIndex("by_active", (q) => q.eq("companyId", args.companyId).eq("isActive", true))
      .collect();
    
    return assignments.map(a => ({
      _id: a._id,
      employeeId: a.employeeId,
      assetType: a.assetType,
      vehicleId: a.vehicleId,
      assetId: a.assetId,
      templateId: a.templateId,
      inspectionFrequency: a.inspectionFrequency,
      isActive: a.isActive,
    }));
  },
});

// Unassign equipment from employee
export const unassignEquipment = mutation({
  args: {
    assignmentId: v.id("equipmentAssignments"),
  },
  returns: v.id("equipmentAssignments"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, {
      isActive: false,
      unassignedDate: Date.now(),
      updatedAt: Date.now(),
    });
    return args.assignmentId;
  },
});

// Create daily inspection check for today
export const createDailyCheck = mutation({
  args: {
    companyId: v.id("companies"),
    assignmentId: v.id("equipmentAssignments"),
    employeeId: v.id("users"),
    assetType: v.union(v.literal("vehicle"), v.literal("asset")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    date: v.string(), // "YYYY-MM-DD"
  },
  returns: v.id("dailyInspectionChecks"),
  handler: async (ctx, args) => {
    // Check if already created for today
    const existing = await ctx.db
      .query("dailyInspectionChecks")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", args.date)
      )
      .filter((c) => c.assignmentId === args.assignmentId)
      .first();

    if (existing) {
      return existing._id;
    }

    return await ctx.db.insert("dailyInspectionChecks", {
      companyId: args.companyId,
      assignmentId: args.assignmentId,
      employeeId: args.employeeId,
      assetType: args.assetType,
      vehicleId: args.vehicleId,
      assetId: args.assetId,
      date: args.date,
      status: "pending",
      createdAt: Date.now(),
    });
  },
});

// Mark inspection as complete
export const completeInspection = mutation({
  args: {
    checkId: v.id("dailyInspectionChecks"),
    inspectionId: v.id("inspections"),
  },
  returns: v.id("dailyInspectionChecks"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.checkId, {
      inspectionId: args.inspectionId,
      status: "completed",
      completedAt: Date.now(),
      updatedAt: Date.now(),
    });
    return args.checkId;
  },
});

// Get today's pending inspections for employee
export const getTodaysPendingInspections = query({
  args: {
    employeeId: v.id("users"),
    date: v.string(), // "YYYY-MM-DD"
  },
  returns: v.array(v.object({
    _id: v.id("dailyInspectionChecks"),
    assignmentId: v.id("equipmentAssignments"),
    assetType: v.string(),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    status: v.string(),
    templateId: v.id("inspectionTemplates"),
  })),
  handler: async (ctx, args) => {
    const checks = await ctx.db
      .query("dailyInspectionChecks")
      .withIndex("by_employee_date", (q) =>
        q.eq("employeeId", args.employeeId).eq("date", args.date)
      )
      .collect();

    // Get assignment and template info
    const result = [];
    for (const check of checks) {
      const assignment = await ctx.db.get(check.assignmentId);
      if (assignment) {
        result.push({
          _id: check._id,
          assignmentId: check.assignmentId,
          assetType: check.assetType,
          vehicleId: check.vehicleId,
          assetId: check.assetId,
          status: check.status,
          templateId: assignment.templateId,
        });
      }
    }
    return result;
  },
});

// Get company-wide daily inspection status
export const getCompanyDailyStatus = query({
  args: {
    companyId: v.id("companies"),
    date: v.string(), // "YYYY-MM-DD"
  },
  returns: v.object({
    total: v.number(),
    completed: v.number(),
    pending: v.number(),
    overdue: v.number(),
    completionPercentage: v.number(),
  }),
  handler: async (ctx, args) => {
    const checks = await ctx.db
      .query("dailyInspectionChecks")
      .withIndex("by_company_date", (q) =>
        q.eq("companyId", args.companyId).eq("date", args.date)
      )
      .collect();

    const total = checks.length;
    const completed = checks.filter(c => c.status === "completed").length;
    const pending = checks.filter(c => c.status === "pending").length;
    const overdue = checks.filter(c => c.status === "overdue").length;

    return {
      total,
      completed,
      pending,
      overdue,
      completionPercentage: total > 0 ? (completed / total) * 100 : 0,
    };
  },
});

// Get equipment with most recent inspection
export const getEquipmentWithLastInspection = query({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.array(v.object({
    assignmentId: v.id("equipmentAssignments"),
    employeeId: v.id("users"),
    assetType: v.string(),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    lastInspectionDate: v.optional(v.number()),
    lastInspectionStatus: v.optional(v.string()),
    lastInspectionId: v.optional(v.id("inspections")),
    daysSinceLastInspection: v.optional(v.number()),
  })),
  handler: async (ctx, args) => {
    const assignments = await ctx.db
      .query("equipmentAssignments")
      .withIndex("by_active", (q) =>
        q.eq("companyId", args.companyId).eq("isActive", true)
      )
      .collect();

    const result = [];
    for (const assignment of assignments) {
      // Get most recent inspection
      const inspections = await ctx.db
        .query("inspections")
        .withIndex("by_asset", (q) => {
          const base = q.eq("assetType", assignment.assetType);
          if (assignment.vehicleId) {
            return base.eq("vehicleId", assignment.vehicleId);
          } else {
            return base.eq("assetId", assignment.assetId);
          }
        })
        .collect();

      const lastInspection = inspections.length > 0
        ? inspections.sort((a, b) => b.dateTime - a.dateTime)[0]
        : null;

      const daysSinceInspection = lastInspection
        ? Math.floor((Date.now() - lastInspection.dateTime) / (1000 * 60 * 60 * 24))
        : null;

      result.push({
        assignmentId: assignment._id,
        employeeId: assignment.employeeId,
        assetType: assignment.assetType,
        vehicleId: assignment.vehicleId,
        assetId: assignment.assetId,
        lastInspectionDate: lastInspection?.dateTime,
        lastInspectionStatus: lastInspection?.overallCondition,
        lastInspectionId: lastInspection?._id,
        daysSinceLastInspection: daysSinceInspection,
      });
    }
    return result;
  },
});