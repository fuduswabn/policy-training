import { v } from "convex/values";
import { internalMutation } from "./_generated/server";

export const processWebhookEvent = internalMutation({
  args: {
    eventType: v.string(),
    reference: v.string(),
    transactionId: v.optional(v.string()),
    amount: v.number(),
    currency: v.string(),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
    packagePlan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    rawPayload: v.string(),
    paidAt: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const now = Date.now();
    const existing = await ctx.db
      .query("paystackPayments")
      .withIndex("by_reference", (q) => q.eq("reference", args.reference))
      .first();

    if (!existing) {
      await ctx.db.insert("paystackPayments", {
        companyId: args.companyId,
        userId: args.userId,
        packagePlan: args.packagePlan,
        reference: args.reference,
        transactionId: args.transactionId,
        amount: args.amount,
        currency: args.currency,
        eventType: args.eventType,
        status: args.status,
        rawPayload: args.rawPayload,
        paidAt: args.paidAt,
        processedAt: now,
        createdAt: now,
        updatedAt: now,
      });
    } else {
      await ctx.db.patch(existing._id, {
        transactionId: args.transactionId ?? existing.transactionId,
        amount: args.amount,
        currency: args.currency,
        eventType: args.eventType,
        status: args.status,
        rawPayload: args.rawPayload,
        paidAt: args.paidAt ?? existing.paidAt,
        updatedAt: now,
      });
    }

    if (args.status === "completed") {
      const previousPlan = (company.planRef as "starter" | "pro" | "enterprise") || "starter";
      await ctx.db.patch(args.companyId, {
        planRef: args.packagePlan,
        subscriptionStatus: "active",
        lastPaymentDate: args.paidAt ?? now,
        paymentDueDate: (args.paidAt ?? now) + 30 * 24 * 60 * 60 * 1000,
        updatedAt: now,
      });

      await ctx.db.insert("packageHistory", {
        companyId: args.companyId,
        managerId: company.managerId,
        previousPlan,
        newPlan: args.packagePlan,
        reason: `Paystack ${args.eventType}`,
        effectiveDate: args.paidAt ?? now,
        createdAt: now,
      });

      await ctx.db.insert("packageNotifications", {
        companyId: args.companyId,
        managerId: company.managerId,
        type: "upgrade",
        title: "Payment received",
        message: `Paystack payment for ${args.packagePlan} was confirmed and your subscription is active.`,
        icon: "check-circle",
        actionUrl: undefined,
        isRead: false,
        isActionable: false,
        createdAt: now,
      });
    }

    return null;
  },
});

export default { processWebhookEvent };
