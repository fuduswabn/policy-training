import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Package tier definitions with limits
const PACKAGE_TIERS = {
  starter: {
    name: "Starter",
    maxEmployees: 10,
    maxGroups: 3,
    features: [
      "daily_quizzes",
      "ai_moderation",
      "basic_support",
      "personal_learning",
      "inspection_access",
    ],
    price: 300,
  },
  pro: {
    name: "Professional",
    maxEmployees: 50,
    maxGroups: 10,
    features: [
      "daily_quizzes",
      "ai_moderation",
      "wellness_chat",
      "conflict_resolution",

      "analytics",
      "personal_learning",
      "inspection_access",
      "inspection_history",
    ],
    price: 700,
  },
  enterprise: {
    name: "Enterprise",
    maxEmployees: 200,
    maxGroups: 50,
    features: [
      "daily_quizzes",
      "ai_moderation",
      "basic_support",

      "wellness_chat",
      "conflict_resolution",
      "email_support",
      "analytics",
      "analytics_advanced",

      "custom_branding",
      "personal_learning",
      "inspection_access",
      "inspection_history",
      "inspection_templates",
    ],
    price: 2500,
  },
} as const;

const PACKAGE_ORDER = {
  starter: 0,
  pro: 1,
  enterprise: 2,
} as const;

// Get current company package info
export const getCompanyPackageInfo = query({
  args: { companyId: v.id("companies") },
  returns: v.object({
    currentPlan: v.union(
      v.literal("starter"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    planName: v.string(),
    maxEmployees: v.number(),
    maxGroups: v.number(),
    currentEmployees: v.number(),
    currentGroups: v.number(),
    features: v.array(v.string()),
    price: v.number(),
    subscriptionStatus: v.string(),
    subscriptionStartDate: v.optional(v.number()),
    nextBillingDate: v.optional(v.number()),
    scheduledPlanRef: v.optional(
      v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise"))
    ),
    scheduledPlanEffectiveDate: v.optional(v.number()),
  }),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const plan =
      (company.planRef as "starter" | "pro" | "enterprise") || "starter";
    const tierInfo = PACKAGE_TIERS[plan as keyof typeof PACKAGE_TIERS];

    const currentEmployees = company.employeeCount;

    const groups = await ctx.db
      .query("employeeGroups")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .take(tierInfo.maxGroups + 1);

    return {
      currentPlan: plan,
      planName: tierInfo.name,
      maxEmployees: tierInfo.maxEmployees,
      maxGroups: tierInfo.maxGroups,
      currentEmployees,
      currentGroups: groups.length,
      features: tierInfo.features,
      price: tierInfo.price,
      subscriptionStatus: company.subscriptionStatus,
      subscriptionStartDate: company.lastPaymentDate,
      nextBillingDate: company.paymentDueDate,
      scheduledPlanRef: company.scheduledPlanRef,
      scheduledPlanEffectiveDate: company.scheduledPlanEffectiveDate,
    };
  },
});

// Get available packages for upgrade/downgrade
export const getAvailablePackages = query({
  args: { companyId: v.id("companies") },
  returns: v.array(
    v.object({
      plan: v.union(
        v.literal("starter"),
        v.literal("pro"),
        v.literal("enterprise")
      ),
      name: v.string(),
      price: v.number(),
      maxEmployees: v.number(),
      maxGroups: v.number(),
      features: v.array(v.string()),
      isCurrentPlan: v.boolean(),
      canDowngradeTo: v.boolean(),
      canUpgradeTo: v.boolean(),
      reason: v.optional(v.string()),
    })
  ),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const currentPlan =
      (company.planRef as "starter" | "pro" | "enterprise") || "starter";

    const packages = (Object.entries(PACKAGE_TIERS) as Array<[
      "starter" | "pro" | "enterprise",
      (typeof PACKAGE_TIERS)[keyof typeof PACKAGE_TIERS]
    ]>).map(([plan, info]) => {
      const isCurrentPlan = plan === currentPlan;
      const isUpgrade =
        PACKAGE_ORDER[plan as keyof typeof PACKAGE_ORDER] >
        PACKAGE_ORDER[currentPlan as keyof typeof PACKAGE_ORDER];
      const isDowngrade =
        PACKAGE_ORDER[plan as keyof typeof PACKAGE_ORDER] <
        PACKAGE_ORDER[currentPlan as keyof typeof PACKAGE_ORDER];

      return {
        plan,
        name: info.name,
        price: info.price,
        maxEmployees: info.maxEmployees,
        maxGroups: info.maxGroups,
        features: info.features,
        isCurrentPlan,
        canUpgradeTo: isUpgrade,
        canDowngradeTo: isDowngrade,
        reason: isCurrentPlan ? "You are already on this plan." : undefined,
      };
    });

    return packages;
  },
});

// Upgrade or downgrade package
export const changePackage = mutation({
  args: {
    companyId: v.id("companies"),
    managerId: v.id("users"),
    newPlan: v.union(
      v.literal("starter"),
      v.literal("pro"),
      v.literal("enterprise")
    ),
    reason: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
    status: v.string(),
    effectiveDate: v.optional(v.number()),
  }),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const currentPlan =
      (company.planRef as "starter" | "pro" | "enterprise") || "starter";
    const now = Date.now();

    // Prevent changing to the same plan
    if (currentPlan === args.newPlan) {
      return {
        success: false,
        status: "error",
        message: "You are already on this plan.",
      };
    }

    // Determine upgrade or downgrade
    const isUpgrade =
      PACKAGE_ORDER[args.newPlan as keyof typeof PACKAGE_ORDER] >
      PACKAGE_ORDER[currentPlan as keyof typeof PACKAGE_ORDER];

    // Get subscription renewal date (next billing date)
    let subscriptionRenewalDate = company.paymentDueDate || now + 30 * 24 * 60 * 60 * 1000; // Default to 30 days from now

    if (isUpgrade) {
      // UPGRADE POLICY: customer pays the full new-plan price.
      // No prorating/splitting, even if they change plans multiple times in one month.
      // Start a fresh 30-day billing period after the full upgrade payment is approved.
      await ctx.db.patch(args.companyId, {
        planRef: args.newPlan,
        subscriptionStatus: "active",
        lastPaymentDate: now,
        paymentDueDate: now + 30 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });

      await ctx.db.insert("packageHistory", {
        companyId: args.companyId,
        managerId: args.managerId,
        previousPlan: currentPlan,
        newPlan: args.newPlan,
        reason: args.reason || "Full-price plan upgrade",
        effectiveDate: now,
        createdAt: now,
      });

      await ctx.db.insert("packageNotifications", {
        companyId: args.companyId,
        managerId: args.managerId,
        type: "upgrade",
        title: "Plan upgraded",
        message: `Your full-price upgrade to ${PACKAGE_TIERS[args.newPlan as keyof typeof PACKAGE_TIERS].name} is active immediately. Your new billing period starts today.`,
        icon: "trending-up",
        actionUrl: undefined,
        isRead: false,
        isActionable: false,
        createdAt: now,
      });

      return {
        success: true,
        status: "completed",
        message: `Successfully upgraded to ${PACKAGE_TIERS[args.newPlan as keyof typeof PACKAGE_TIERS].name} at the full plan price. Your new billing period starts today.`,
        effectiveDate: now,
      };
    } else {
      // DOWNGRADE: Schedule for next billing period
      await ctx.db.patch(args.companyId, {
        scheduledPlanRef: args.newPlan,
        scheduledPlanEffectiveDate: subscriptionRenewalDate,
        updatedAt: now,
      });

      await ctx.db.insert("packageHistory", {
        companyId: args.companyId,
        managerId: args.managerId,
        previousPlan: currentPlan,
        newPlan: args.newPlan,
        reason: args.reason || "Plan downgrade via Google Play (scheduled)",
        effectiveDate: subscriptionRenewalDate,
        createdAt: now,
      });

      const renewalDate = new Date(subscriptionRenewalDate).toLocaleDateString();
      await ctx.db.insert("packageNotifications", {
        companyId: args.companyId,
        managerId: args.managerId,
        type: "downgrade",
        title: "Downgrade scheduled",
        message: `Your plan is scheduled to downgrade to ${PACKAGE_TIERS[args.newPlan as keyof typeof PACKAGE_TIERS].name} on ${renewalDate}. You'll continue to enjoy your current plan until then.`,
        icon: "trending-down",
        actionUrl: undefined,
        isRead: false,
        isActionable: false,
        createdAt: now,
      });

      return {
        success: true,
        status: "scheduled",
        message: `Downgrade scheduled. You will continue with ${PACKAGE_TIERS[currentPlan as keyof typeof PACKAGE_TIERS].name} until ${renewalDate}, then automatically switch to ${PACKAGE_TIERS[args.newPlan as keyof typeof PACKAGE_TIERS].name}.`,
        effectiveDate: subscriptionRenewalDate,
      };
    }
  },
});

// Admin verifies payment and approves/rejects package change
export const verifyPaymentAndApprovePackage = mutation({
  args: {
    paymentProofId: v.id("paymentProofs"),
    approved: v.boolean(),
    adminNotes: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  async handler(ctx, args) {
    const paymentProof = await ctx.db.get(args.paymentProofId);
    if (!paymentProof) throw new Error("Payment proof not found");

    const now = Date.now();
    const newStatus = args.approved ? "verified" : "rejected";

    // Update payment proof record
    await ctx.db.patch(args.paymentProofId, {
      status: newStatus,
      verifiedAt: now,
      verifiedBy: "admin",
      adminNotes: args.adminNotes,
    });

    if (args.approved) {
      const company = await ctx.db.get(paymentProof.companyId);
      if (!company) throw new Error("Company not found");

      await ctx.db.patch(paymentProof.companyId, {
        planRef: paymentProof.newPlan,
        subscriptionStatus: "active",
        paymentDueDate: undefined,
        lastPaymentDate: now,
        scheduledPlanRef: undefined,
        scheduledPlanEffectiveDate: undefined,
        updatedAt: now,
      });

      await ctx.db.insert("packageHistory", {
        companyId: paymentProof.companyId,
        managerId: paymentProof.managerId,
        previousPlan: paymentProof.previousPlan,
        newPlan: paymentProof.newPlan,
        reason: `Manual approval: ${paymentProof.reason || ""}`,
        effectiveDate: now,
        createdAt: now,
      });

      // Use valid notification type
      await ctx.db.insert("packageNotifications", {
        companyId: paymentProof.companyId,
        managerId: paymentProof.managerId,
        type: "upgrade",
        title: "Package upgraded",
        message: `Your payment has been verified. Your plan is now ${PACKAGE_TIERS[paymentProof.newPlan as keyof typeof PACKAGE_TIERS].name}.`,
        icon: "check-circle",
        actionUrl: undefined,
        isRead: false,
        isActionable: false,
        createdAt: now,
      });

      return {
        success: true,
        message: `Package upgraded to ${PACKAGE_TIERS[paymentProof.newPlan as keyof typeof PACKAGE_TIERS].name}.`,
      };
    } else {
      // Use valid notification type for rejection
      await ctx.db.insert("packageNotifications", {
        companyId: paymentProof.companyId,
        managerId: paymentProof.managerId,
        type: "downgrade",
        title: "Payment verification rejected",
        message: `Your payment verification was rejected. ${args.adminNotes ? "Reason: " + args.adminNotes : ""}`,
        icon: "cancel",
        actionUrl: undefined,
        isRead: false,
        isActionable: false,
        createdAt: now,
      });

      return {
        success: false,
        message: "Payment verification rejected.",
      };
    }
  },
});

// Get package notifications
export const getPackageNotifications = query({
  args: { managerId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("packageNotifications"),
      type: v.string(),
      title: v.string(),
      message: v.string(),
      icon: v.optional(v.string()),
      isRead: v.boolean(),
      isActionable: v.boolean(),
      createdAt: v.number(),
    })
  ),
  async handler(ctx, args) {
    const notifications = await ctx.db
      .query("packageNotifications")
      .withIndex("by_manager", (q: any) => q.eq("managerId", args.managerId))
      .order("desc")
      .collect();

    return notifications.map((n: any) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      icon: n.icon,
      isRead: n.isRead,
      isActionable: n.isActionable,
      createdAt: n.createdAt,
    }));
  },
});

export const markPackageNotificationRead = mutation({
  args: {
    notificationId: v.id("packageNotifications"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const notification = await ctx.db.get(args.notificationId);
    if (!notification) {
      throw new Error("Notification not found");
    }

    await ctx.db.patch(args.notificationId, {
      isRead: true,
    });

    return null;
  },
});

// Get unread notification count
export const getUnreadPackageNotificationCount = query({
  args: { managerId: v.id("users") },
  returns: v.number(),
  async handler(ctx, args) {
    const notifications = await ctx.db
      .query("packageNotifications")
      .withIndex("by_manager", (q: any) => q.eq("managerId", args.managerId))
      .collect();

    return notifications.filter((n: any) => !n.isRead).length;
  },
});

// Get package change history
export const getPackageHistory = query({
  args: { companyId: v.id("companies") },
  returns: v.array(
    v.object({
      previousPlan: v.string(),
      newPlan: v.string(),
      reason: v.optional(v.string()),
      effectiveDate: v.number(),
      createdAt: v.number(),
    })
  ),
  async handler(ctx, args) {
    const history = await ctx.db
      .query("packageHistory")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .order("desc")
      .collect();

    return history.map((h: any) => ({
      previousPlan: h.previousPlan,
      newPlan: h.newPlan,
      reason: h.reason,
      effectiveDate: h.effectiveDate,
      createdAt: h.createdAt,
    }));
  },
});

export const activateScheduledDowngrades = mutation({
  args: {},
  returns: v.object({ processed: v.number() }),
  async handler(ctx) {
    const now = Date.now();
    const companies = await ctx.db.query("companies").collect();
    let processed = 0;

    for (const company of companies) {
      if (!company.scheduledPlanRef || !company.scheduledPlanEffectiveDate) continue;
      if (company.scheduledPlanEffectiveDate > now) continue;

      const previousPlan = (company.planRef as "starter" | "pro" | "enterprise") || "starter";
      const newPlan = company.scheduledPlanRef;

      await ctx.db.patch(company._id, {
        planRef: newPlan,
        scheduledPlanRef: undefined,
        scheduledPlanEffectiveDate: undefined,
        updatedAt: now,
      });

      await ctx.db.insert("packageHistory", {
        companyId: company._id,
        managerId: company.managerId,
        previousPlan,
        newPlan,
        reason: "Scheduled downgrade activated",
        effectiveDate: now,
        createdAt: now,
      });

      await ctx.db.insert("packageNotifications", {
        companyId: company._id,
        managerId: company.managerId,
        type: "downgrade",
        title: "Downgrade activated",
        message: `Your plan has switched to ${PACKAGE_TIERS[newPlan as keyof typeof PACKAGE_TIERS].name} as scheduled.`,
        icon: "trending-down",
        actionUrl: undefined,
        isRead: false,
        isActionable: false,
        createdAt: now,
      });

      processed += 1;
    }

    return { processed };
  },
});


// Remove mistaken package request records for a company
export const clearCompanyPackageRequests = mutation({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.object({
    deletedHistory: v.number(),
    deletedNotifications: v.number(),
  }),
  async handler(ctx, args) {
    const history = await ctx.db
      .query("packageHistory")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const notifications = await ctx.db
      .query("packageNotifications")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    for (const row of history) {
      await ctx.db.delete(row._id);
    }

    for (const row of notifications) {
      await ctx.db.delete(row._id);
    }

    return {
      deletedHistory: history.length,
      deletedNotifications: notifications.length,
    };
  },
});
// Get pending payment verifications for admin
export const getPendingPaymentVerifications = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("paymentProofs"),
      companyId: v.id("companies"),
      managerId: v.id("users"),
      previousPlan: v.string(),
      newPlan: v.string(),
      proofUrl: v.string(),
      status: v.string(),
      reason: v.optional(v.string()),
      createdAt: v.number(),
    })
  ),
  async handler(ctx) {
    const proofs = await ctx.db
      .query("paymentProofs")
      .filter((q: any) => q.eq(q.field("status"), "pending_verification"))
      .order("desc")
      .collect();

    return proofs.map((p: any) => ({
      _id: p._id,
      companyId: p.companyId,
      managerId: p.managerId,
      previousPlan: p.previousPlan,
      newPlan: p.newPlan,
      proofUrl: p.proofUrl,
      status: p.status,
      reason: p.reason,
      createdAt: p.createdAt,
    }));
  },
});

export default {
  getCompanyPackageInfo,
  getAvailablePackages,
  changePackage,
  getPackageNotifications,
  markPackageNotificationRead,
  getUnreadPackageNotificationCount,
  getPackageHistory,
  activateScheduledDowngrades,
};
