import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Banking details stored securely on the backend only
const BANKING_DETAILS = {
  bankName: "Standard Bank",
  branchName: "DURBAN ABC",
  branchCode: "126",
  accountHolder: "MR BULELANI BN FUDUSWA",
  accountNumber: "05 058 076 0",
  accountType: "CURRENT",
  swiftCode: "SBZAZAJJ",
  whatsappNumber: "+27835161488",
};

// Pricing for packages (ZAR)
const PACKAGE_PRICES: { [key: string]: number } = {
  starter: 300,
  pro: 700,
  enterprise: 2500,
};

// Package details
const PACKAGE_DETAILS: Record<string, any> = {
  starter: {
    name: 'Starter',
    price: PACKAGE_PRICES.starter,
    maxEmployees: 10,
    maxGroups: 3,
    features: [
      'Up to 10 employees',
      'Up to 3 groups',
      'Daily auto-generated quizzes',
      'Policy management',
      'Basic compliance tracking',
    ],
  },
  pro: {
    name: 'Professional',
    price: PACKAGE_PRICES.pro,
    maxEmployees: 50,
    maxGroups: 10,
    features: [
      'Up to 50 employees',
      'Up to 10 groups',
      'Daily auto-generated quizzes',

      'Advanced analytics',
      'Custom branding',
      'Wellness chat',
      'Conflict resolution',
    ],
  },
  enterprise: {
    name: 'Enterprise',
    price: PACKAGE_PRICES.enterprise,
    maxEmployees: 200,
    maxGroups: 50,
    features: [
      'Up to 200 employees',
      'Up to 50 groups',


      'Custom integrations',
      'API access',
      'Wellness chat',
      'Conflict resolution',
      'Advanced analytics',
    ],
  },
};

// Generate unique payment reference
function slugifyReferenceSource(source: string): string {
  return source
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, '')
    .slice(0, 6) || 'EFT';
}

function shortCompanyToken(companyId: string): string {
  return companyId.replace(/[^a-zA-Z0-9]/g, '').slice(-4).toUpperCase() || '0000';
}

function generatePaymentReference(source: string, companyId: string): string {
  return `${slugifyReferenceSource(source)}-${shortCompanyToken(companyId)}`;
}

const NON_EXPIRING_REFERENCE_DATE = new Date('2099-12-31T23:59:59.999Z').getTime();

// Initiate EFT payment (user selects package and gets payment reference)
export const initiateEFTPayment = mutation({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
    packagePlan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
  },
  returns: v.object({
    paymentId: v.id("eftPayments"),
    paymentReference: v.string(),
    referenceSource: v.string(),
    companyName: v.string(),
    userEmail: v.string(),
    amount: v.number(),
    currency: v.string(),
    packageName: v.string(),
    maxEmployees: v.number(),
    maxEmployeeGroups: v.number(),
    features: v.array(v.string()),
    bankingDetails: v.object({
      bankName: v.string(),
      branchName: v.string(),
      branchCode: v.string(),
      accountHolder: v.string(),
      accountNumber: v.string(),
      accountType: v.string(),
      swiftCode: v.string(),
    }),
    expiresAt: v.number(),
    whatsappLink: v.string(),
  }),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    const packageDetails = PACKAGE_DETAILS[args.packagePlan];
    const amount = packageDetails.price;
    const companyName = company.name?.trim() || user.email;
    const paymentReference = generatePaymentReference(companyName, args.companyId);
    const expiresAt = NON_EXPIRING_REFERENCE_DATE;

    const existingPayments = await ctx.db
      .query("eftPayments")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const existingPayment = existingPayments.find(
      (payment: any) =>
        payment.status === "pending" &&
        payment.packagePlan === args.packagePlan &&
        payment.paymentReference === paymentReference
    );

    const paymentId = existingPayment?._id ?? await ctx.db.insert("eftPayments", {
      companyId: args.companyId,
      userId: args.userId,
      packagePlan: args.packagePlan,
      amount,
      currency: "ZAR",
      paymentReference,
      status: "pending",
      createdAt: Date.now(),
      expiresAt,
    });

    // Generate WhatsApp link
    const message = encodeURIComponent(
      `Hi, I've sent an EFT payment with reference: ${paymentReference}`
    );
    const whatsappLink = `https://wa.me/${BANKING_DETAILS.whatsappNumber.replace(/\+/, "")}?text=${message}`;

    return {
      paymentId,
      paymentReference,
      referenceSource: companyName,
      companyName,
      userEmail: user.email,
      amount,
      currency: "ZAR",
      packageName: packageDetails.name,
      maxEmployees: packageDetails.maxEmployees,
      maxEmployeeGroups: packageDetails.maxGroups,
      features: packageDetails.features,
      bankingDetails: {
        bankName: BANKING_DETAILS.bankName,
        branchName: BANKING_DETAILS.branchName,
        branchCode: BANKING_DETAILS.branchCode,
        accountHolder: BANKING_DETAILS.accountHolder,
        accountNumber: BANKING_DETAILS.accountNumber,
        accountType: BANKING_DETAILS.accountType,
        swiftCode: BANKING_DETAILS.swiftCode,
      },
      expiresAt,
      whatsappLink,
    };
  },
});

// Get user's pending EFT payments
export const getUserEFTPayments = query({
  args: { userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("eftPayments"),
      paymentReference: v.string(),
      packagePlan: v.string(),
      amount: v.number(),
      status: v.string(),
      createdAt: v.number(),
      expiresAt: v.number(),
      proofUploadedAt: v.optional(v.number()),
      verifiedAt: v.optional(v.number()),
    })
  ),
  async handler(ctx, args) {
    const payments = await ctx.db
      .query("eftPayments")
      .withIndex("by_user", (q: any) => q.eq("userId", args.userId))
      .collect();

    return payments.map((p: any) => ({
      _id: p._id,
      paymentReference: p.paymentReference,
      packagePlan: p.packagePlan,
      amount: p.amount,
      status: p.status,
      createdAt: p.createdAt,
      expiresAt: p.expiresAt,
      proofUploadedAt: p.proofUploadedAt,
      verifiedAt: p.verifiedAt,
    }));
  },
});

// Add this new query to check company payment status
export const getCompanyPaymentStatus = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const latestPayment = await ctx.db
      .query("eftPayments")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .order("desc")
      .first();

    if (!latestPayment) {
      return { status: "no_payment", reference: null, planType: null };
    }

    // Check status field (pending, verified, failed, expired)
    if (latestPayment.status === "pending") {
      return {
        status: "pending",
        reference: latestPayment.paymentReference,
        planType: latestPayment.packagePlan,
      };
    }

    if (latestPayment.status === "failed") {
      return {
        status: "rejected",
        reference: latestPayment.paymentReference,
        planType: latestPayment.packagePlan,
      };
    }

    if (latestPayment.status === "verified") {
      return {
        status: "approved",
        reference: latestPayment.paymentReference,
        planType: latestPayment.packagePlan,
      };
    }

    // For expired or other statuses
    return { status: "no_payment", reference: null, planType: null };
  },
});

// Get payment details by reference
export const getEFTPaymentByReference = query({
  args: { paymentReference: v.string() },
  returns: v.union(
    v.object({
      _id: v.id("eftPayments"),
      paymentReference: v.string(),
      packagePlan: v.string(),
      amount: v.number(),
      currency: v.string(),
      status: v.string(),
      expiresAt: v.number(),
      proofUploadedAt: v.optional(v.number()),
      verifiedAt: v.optional(v.number()),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("eftPayments")
      .withIndex("by_reference", (q: any) => q.eq("paymentReference", args.paymentReference))
      .first();

    if (!payment) return null;

    return {
      _id: payment._id,
      paymentReference: payment.paymentReference,
      packagePlan: payment.packagePlan,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status,
      expiresAt: payment.expiresAt,
      proofUploadedAt: payment.proofUploadedAt,
      verifiedAt: payment.verifiedAt,
    };
  },
});

// Update EFT payment with proof of payment (storage URL from Convex storage)
export const uploadEFTProofOfPayment = mutation({
  args: {
    paymentId: v.id("eftPayments"),
    proofOfPaymentUrl: v.string(), // Storage URL from Convex file upload
  },
  returns: v.object({
    status: v.string(),
    message: v.string(),
  }),
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    // Proof is uploaded for admin review only. Final activation happens in admin verification.
    await ctx.db.patch(args.paymentId, {
      proofOfPaymentUrl: args.proofOfPaymentUrl,
      proofUploadedAt: Date.now(),
      status: "pending",
    });

    return {
      status: "success",
      message: `Proof uploaded. Waiting for admin verification. Reference: ${payment.paymentReference}`,
    };
  },
});

// User: Submit a generated EFT payment for admin review after paying
export const submitEFTPaymentForReview = mutation({
  args: {
    paymentId: v.id("eftPayments"),
  },
  returns: v.object({
    status: v.string(),
    message: v.string(),
  }),
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    if (payment.status === "verified") {
      return {
        status: "success",
        message: "Payment has already been verified",
      };
    }

    await ctx.db.patch(args.paymentId, {
      status: "pending",
    });

    return {
      status: "success",
      message: `Payment sent to admin for review. Reference: ${payment.paymentReference}`,
    };
  },
});

// Admin: Get all pending EFT payments (for verification)
export const getPendingEFTPayments = query({
  args: {},
  returns: v.array(
    v.object({
      _id: v.id("eftPayments"),
      paymentReference: v.string(),
      companyId: v.id("companies"),
      userId: v.id("users"),
      packagePlan: v.string(),
      amount: v.number(),
      status: v.string(),
      createdAt: v.number(),
      proofUploadedAt: v.optional(v.number()),
      userEmail: v.string(),
      companyName: v.string(),
      proofOfPaymentUrl: v.optional(v.string()),
    })
  ),
  async handler(ctx) {
    const payments = await ctx.db
      .query("eftPayments")
      .withIndex("by_status", (q: any) => q.eq("status", "pending"))
      .collect();

    const latestByReference = new Map<string, (typeof payments)[number]>();
    for (const payment of payments) {
      const key = `${payment.companyId}:${payment.packagePlan}:${payment.paymentReference}`;
      const existing = latestByReference.get(key);
      if (!existing || payment.createdAt > existing.createdAt) {
        latestByReference.set(key, payment);
      }
    }

    const result = [];
    for (const p of latestByReference.values()) {
      const user = await ctx.db.get(p.userId);
      const company = await ctx.db.get(p.companyId);
      result.push({
        _id: p._id,
        paymentReference: p.paymentReference,
        companyId: p.companyId,
        userId: p.userId,
        packagePlan: p.packagePlan,
        amount: p.amount,
        status: p.status,
        createdAt: p.createdAt,
        proofUploadedAt: p.proofUploadedAt,
        userEmail: user?.email || "unknown",
        companyName: company?.name || "unknown",
        proofOfPaymentUrl: p.proofOfPaymentUrl,
      });
    }
    return result;
  },
});

// Admin: Verify EFT payment and activate subscription
export const verifyEFTPayment = mutation({
  args: {
    paymentId: v.id("eftPayments"),
    verified: v.boolean(),
    notes: v.optional(v.string()),
  },
  returns: v.object({
    status: v.string(),
    message: v.string(),
  }),
  async handler(ctx, args) {
    const payment = await ctx.db.get(args.paymentId);
    if (!payment) throw new Error("Payment not found");

    const company = await ctx.db.get(payment.companyId);
    if (!company) throw new Error("Company not found");

    const user = await ctx.db.get(payment.userId);
    if (!user) throw new Error("User not found");

    if (args.verified) {
      // Update payment status to verified
      await ctx.db.patch(args.paymentId, {
        status: "verified",
        verifiedAt: Date.now(),
        notes: args.notes,
      });

      // Activate company subscription with the purchased plan
      const now = Date.now();
      const paymentDueDate = now + 30 * 24 * 60 * 60 * 1000;
      await ctx.db.patch(payment.companyId, {
        planRef: payment.packagePlan as "starter" | "pro" | "enterprise",
        subscriptionStatus: "active",
        lastPaymentDate: now,
        paymentDueDate,
        scheduledPlanRef: undefined,
        scheduledPlanEffectiveDate: undefined,
        updatedAt: now,
      });

      // Create notification for manager
      await ctx.db.insert("managerNotifications", {
        companyId: payment.companyId,
        managerId: company.managerId,
        type: "payment_approved",
        title: "Payment Approved",
        message: `Your ${payment.packagePlan} plan payment (Ref: ${payment.paymentReference}) has been approved and activated.`,
        employeeId: payment.userId,
        employeeName: user.fullName,
        isRead: false,
        createdAt: Date.now(),
      });

      return {
        status: "success",
        message: `Payment verified. ${payment.packagePlan} plan activated for ${company.name}`,
      };
    } else {
      // Mark as failed
      await ctx.db.patch(args.paymentId, {
        status: "failed",
        notes: args.notes,
      });

      // Create notification for manager
      await ctx.db.insert("managerNotifications", {
        companyId: payment.companyId,
        managerId: company.managerId,
        type: "payment_rejected",
        title: "Payment Rejected",
        message: `Your payment (Ref: ${payment.paymentReference}) has been rejected. Reason: ${args.notes || "Verification failed"}. Please resubmit proof of payment.`,
        employeeId: payment.userId,
        employeeName: user.fullName,
        isRead: false,
        createdAt: Date.now(),
      });

      return {
        status: "failed",
        message: "Payment verification failed",
      };
    }
  },
});


// Admin cleanup: remove duplicate pending EFT payment requests for one company
export const clearPendingEFTPaymentsForCompany = mutation({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.object({
    deletedCount: v.number(),
  }),
  async handler(ctx, args) {
    const pendingPayments = await ctx.db
      .query("eftPayments")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const deletable = pendingPayments.filter((payment: any) => payment.status === "pending");

    for (const payment of deletable) {
      await ctx.db.delete(payment._id);
    }

    return { deletedCount: deletable.length };
  },
});

export default {
  initiateEFTPayment,
  getUserEFTPayments,
  getEFTPaymentByReference,
  uploadEFTProofOfPayment,
  submitEFTPaymentForReview,
  getPendingEFTPayments,
  verifyEFTPayment,
  clearPendingEFTPaymentsForCompany,
};
