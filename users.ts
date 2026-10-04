import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireAdminUser, requireCompanyManager, requireCompanyMember } from "./security";

// Simple password hashing
function hashPassword(password: string): string {
  const salt = "policy-training-salt";
  const combined = password + salt;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function generateResetCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function hashResetCode(email: string, code: string): string {
  return hashPassword(`${normalizeEmail(email)}:${code}`);
}

function getCompanyPlan(company: any): 'starter' | 'pro' | 'enterprise' {
  void company;
  return 'enterprise';
}

function getQuizQuestionLimit(company: any): number {
  void company;
  return 9999;
}

function getMaxEmployeesForCompany(company: any): number {
  const plan = company?.planRef || 'starter';
  switch (plan) {
    case 'pro':
      return 50;
    case 'enterprise':
      return 200;
    case 'starter':
    default:
      return 10;
  }
}

// Generate random invite code
function generateInviteCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Admin signup (website owner - no company)
export const signUpAdmin = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    role: v.literal("admin"),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashPassword(args.password),
      fullName: args.fullName,
      role: "admin",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { userId, email: args.email, role: "admin" as const };
  },
});

// Manager signup with company creation
export const signUpManager = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    companyName: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    role: v.literal("manager"),
    companyId: v.id("companies"),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    const hashedPassword = hashPassword(args.password);
    
    // Create user first
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashedPassword,
      fullName: args.fullName,
      role: "manager",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Create company with 14-day trial
    const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const companyId = await ctx.db.insert("companies", {
      name: args.companyName,
      managerId: userId,
      subscriptionStatus: "trial",
      trialEndsAt,
      employeeCount: 1,
      quizQuestionCount: 5,
      quizStyle: "original",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Update user with companyId
    await ctx.db.patch(userId, { companyId });

    return { userId, email: args.email, role: "manager" as const, companyId, subscriptionStatus: "trial" as const };
  },
});

// Employee signup with invite code
export const signUpEmployee = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    inviteCode: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    role: v.literal("employee"),
    companyId: v.id("companies"),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    // Find invite code
    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.inviteCode.toUpperCase()))
      .first();

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    if (invite.isUsed) {
      throw new Error("Invite code already used");
    }

    if (invite.expiresAt < Date.now()) {
      throw new Error("Invite code expired");
    }

    // Check company status and employee limit
    const company = await ctx.db.get(invite.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    if (company.subscriptionStatus !== 'active' && company.subscriptionStatus !== 'trial') {
      throw new Error('Company subscription is not active. Please complete payment first.');
    }

    const maxEmployees = getMaxEmployeesForCompany(company);
    if (company.employeeCount >= maxEmployees) {
      throw new Error(`This company has reached its limit of ${maxEmployees} users. Upgrade the package to add more employees.`);
    }

    const hashedPassword = hashPassword(args.password);
    const groupIds = invite.groupId ? [invite.groupId] : [];

    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashedPassword,
      fullName: args.fullName,
      role: "employee",
      companyId: invite.companyId,
      groupIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    // Mark invite as used
    await ctx.db.patch(invite._id, { isUsed: true, usedBy: userId });

    // Increment employee count
    await ctx.db.patch(invite.companyId, { 
      employeeCount: company.employeeCount + 1,
      updatedAt: Date.now(),
    });

    return { userId, email: args.email, role: "employee" as const, companyId: invite.companyId };
  },
});

// Legacy signup for backwards compatibility
export const signUp = mutation({
  args: {
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
    companyName: v.optional(v.string()),
    inviteCode: v.optional(v.string()),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
    companyId: v.optional(v.id("companies")),
    fullName: v.string(),
  }),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    const hashedPassword = hashPassword(args.password);

    if (args.role === "admin") {
      const userId = await ctx.db.insert("users", {
        email: args.email,
        password: hashedPassword,
        fullName: args.fullName,
        role: "admin",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });
      return { userId, email: args.email, role: args.role, fullName: args.fullName };
    }

    if (args.role === "manager") {
      if (!args.companyName) {
        throw new Error("Company name required for manager");
      }
      
      const userId = await ctx.db.insert("users", {
        email: args.email,
        password: hashedPassword,
        fullName: args.fullName,
        role: "manager",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
      const companyId = await ctx.db.insert("companies", {
        name: args.companyName,
        managerId: userId,
        subscriptionStatus: "trial",
        trialEndsAt,
        employeeCount: 1,
        quizQuestionCount: 5,
        quizStyle: "original",
        createdAt: Date.now(),
        updatedAt: Date.now(),
      });

      await ctx.db.patch(userId, { companyId });
      return { userId, email: args.email, role: args.role, companyId, fullName: args.fullName };
    }

    // Employee
    if (!args.inviteCode) {
      throw new Error("Invite code required for employee");
    }

    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.inviteCode.toUpperCase()))
      .first();

    if (!invite || invite.isUsed || invite.expiresAt < Date.now()) {
      throw new Error("Invalid or expired invite code");
    }

    const company = await ctx.db.get(invite.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const groupIds = invite.groupId ? [invite.groupId] : [];
    const userId = await ctx.db.insert("users", {
      email: args.email,
      password: hashedPassword,
      fullName: args.fullName,
      role: "employee",
      companyId: invite.companyId,
      groupIds,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(invite._id, { isUsed: true, usedBy: userId });
    await ctx.db.patch(invite.companyId, { 
      employeeCount: company.employeeCount + 1,
      updatedAt: Date.now(),
    });

    return { userId, email: args.email, role: args.role, companyId: invite.companyId, fullName: args.fullName };
  },
});

// Create a company for an existing manager (recovery for old accounts)
export const createCompanyForManager = mutation({
  args: {
    managerId: v.id("users"),
    companyName: v.string(),
  },
  returns: v.object({
    companyId: v.id("companies"),
  }),
  async handler(ctx, args) {
    const manager = await ctx.db.get(args.managerId);
    if (!manager) throw new Error("Manager not found");
    if (manager.role !== "manager") throw new Error("Only managers can create a company");

    if (manager.companyId) {
      return { companyId: manager.companyId };
    }

    const trialEndsAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    const companyId = await ctx.db.insert("companies", {
      name: args.companyName,
      managerId: manager._id,
      subscriptionStatus: "trial",
      trialEndsAt,
      employeeCount: 1,
      quizQuestionCount: 5,
      quizStyle: "original",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    await ctx.db.patch(manager._id, { companyId, updatedAt: Date.now() });

    return { companyId };
  },
});

export const requestPasswordReset = mutation({
  args: {
    email: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  async handler(ctx, args) {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user) {
      return {
        success: true,
        message: "If that email exists, a reset code has been sent.",
      };
    }

    const now = Date.now();
    const recentTokens = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .take(3);

    const lastToken = recentTokens[0];
    if (lastToken && lastToken.createdAt > now - 60 * 1000) {
      return {
        success: true,
        message: "If that email exists, a reset code has been sent.",
      };
    }

    for (const token of recentTokens) {
      if (!token.isUsed && token.expiresAt > now) {
        await ctx.db.patch(token._id, { isUsed: true, usedAt: now });
      }
    }

    const code = generateResetCode();
    await ctx.db.insert("passwordResetTokens", {
      userId: user._id,
      email,
      codeHash: hashResetCode(email, code),
      expiresAt: now + 30 * 60 * 1000,
      isUsed: false,
      createdAt: now,
    });

    await ctx.scheduler.runAfter(0, internal.notifications.sendPasswordResetEmail, {
      to: user.email,
      code,
    });

    return {
      success: true,
      message: "If that email exists, a reset code has been sent.",
    };
  },
});

export const resetPassword = mutation({
  args: {
    email: v.string(),
    code: v.string(),
    newPassword: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  async handler(ctx, args) {
    const email = normalizeEmail(args.email);
    const code = args.code.trim();

    if (args.newPassword.length < 6) {
      throw new Error("Password must be at least 6 characters.");
    }

    if (!/^\d{6}$/.test(code)) {
      throw new Error("Enter the 6-digit reset code.");
    }

    const token = await ctx.db
      .query("passwordResetTokens")
      .withIndex("by_email_and_code_hash", (q) => q.eq("email", email).eq("codeHash", hashResetCode(email, code)))
      .first();

    if (!token || token.isUsed || token.expiresAt < Date.now()) {
      throw new Error("Reset code is invalid or expired.");
    }

    const user = await ctx.db.get(token.userId);
    if (!user || user.email !== email) {
      throw new Error("Reset code is invalid or expired.");
    }

    const now = Date.now();
    await ctx.db.patch(user._id, {
      password: hashPassword(args.newPassword),
      updatedAt: now,
    });
    await ctx.db.patch(token._id, { isUsed: true, usedAt: now });

    return {
      success: true,
      message: "Password updated. You can now sign in.",
    };
  },
});

export const signIn = mutation({
  args: {
    email: v.string(),
    password: v.string(),
  },
  returns: v.object({
    userId: v.id("users"),
    email: v.string(),
    fullName: v.string(),
    role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
    companyId: v.optional(v.id("companies")),
    companyName: v.optional(v.string()),
    subscriptionStatus: v.optional(v.string()),
  }),
  async handler(ctx, args) {
    const email = normalizeEmail(args.email);
    const user = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", email))
      .first();

    if (!user || !verifyPassword(args.password, user.password)) {
      throw new Error("Invalid email or password");
    }

    let companyName: string | undefined;
    let subscriptionStatus: string | undefined;

    if (user.companyId) {
      const company = await ctx.db.get(user.companyId);
      if (company) {
        companyName = company.name;
        subscriptionStatus = company.subscriptionStatus;
      }
    }

    // FREE ACCESS MODE: Skip auto-expiry checks for testing
    // To re-enable paid subscriptions later, uncomment the blocks below:
    //
    // if (company.subscriptionStatus === "trial" && company.trialEndsAt && company.trialEndsAt < Date.now()) {
    //   await ctx.db.patch(company._id, { subscriptionStatus: "expired" });
    //   subscriptionStatus = "expired";
    // }
    // if (company.subscriptionStatus === "active" && company.paymentDueDate && company.paymentDueDate < Date.now()) {
    //   await ctx.db.patch(company._id, { subscriptionStatus: "expired" });
    //   subscriptionStatus = "expired";
    // }


    return {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      companyName,
      subscriptionStatus,
    };
  },
});

export const updatePushToken = mutation({
  args: {
    userId: v.id("users"),
    pushToken: v.union(v.string(), v.null()),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      throw new Error("User not found");
    }

    await ctx.db.patch(args.userId, {
      pushToken: args.pushToken ?? undefined,
      updatedAt: Date.now(),
    });

    return null;
  },
});

export const getCurrentUser = query({
  args: { userId: v.id("users") },
  returns: v.union(
    v.object({
      userId: v.id("users"),
      email: v.string(),
      fullName: v.string(),
      role: v.union(v.literal("admin"), v.literal("manager"), v.literal("employee")),
      companyId: v.optional(v.id("companies")),
      companyName: v.optional(v.string()),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    let companyName: string | undefined;
    if (user.companyId) {
      const company = await ctx.db.get(user.companyId);
      companyName = company?.name;
    }

    return {
      userId: user._id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      companyId: user.companyId,
      companyName,
    };
  },
});

// Generate invite code for employees
export const createInviteCode = mutation({
  args: {
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    groupId: v.optional(v.id("employeeGroups")),
  },
  returns: v.object({
    code: v.string(),
    expiresAt: v.number(),
  }),
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.createdBy, args.companyId);
    const code = generateInviteCode();
    const expiresAt = Date.now() + 7 * 24 * 60 * 60 * 1000; // 7 days

    await ctx.db.insert("inviteCodes", {
      code,
      companyId: args.companyId,
      createdBy: args.createdBy,
      groupId: args.groupId,
      isUsed: false,
      expiresAt,
      createdAt: Date.now(),
    });

    return { code, expiresAt };
  },
});

// Get all companies (for admin)
export const getAllCompanies = query({
  args: {
    userId: v.optional(v.id("users")),
  },
  returns: v.array(v.object({
    _id: v.id("companies"),
    name: v.string(),
    managerName: v.string(),
    managerEmail: v.string(),
    subscriptionStatus: v.string(),
    employeeCount: v.number(),
    paymentDueDate: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    createdAt: v.number(),
  })),
  async handler(ctx, args) {
    if (!args.userId) return [];
    await requireAdminUser(ctx, args.userId);
    const companies = await ctx.db.query("companies").collect();
    
    const result = [];
    for (const company of companies) {
      const manager = await ctx.db.get(company.managerId);
      result.push({
        _id: company._id,
        name: company.name,
        managerName: manager?.fullName || "Unknown",
        managerEmail: manager?.email || "Unknown",
        subscriptionStatus: company.subscriptionStatus,
        employeeCount: company.employeeCount,
        paymentDueDate: company.paymentDueDate,
        trialEndsAt: company.trialEndsAt,
        createdAt: company.createdAt,
      });
    }
    
    return result;
  },
});

// Get company employees (for manager)
export const getCompanyEmployees = query({
  args: { companyId: v.id("companies"), userId: v.optional(v.id("users")) },
  returns: v.array(v.object({
    _id: v.id("users"),
    fullName: v.string(),
    email: v.string(),
    groupIds: v.optional(v.array(v.id("employeeGroups"))),
    createdAt: v.number(),
  })),
  async handler(ctx, args) {
    if (!args.userId) return [];
    await requireCompanyMember(ctx, args.userId, args.companyId, ["manager"]);
    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();
    
    return employees
      .filter(e => e.role === "employee")
      .map(e => ({
        _id: e._id,
        fullName: e.fullName,
        email: e.email,
        groupIds: e.groupIds,
        createdAt: e.createdAt,
      }));
  },
});

// Get company groups
export const getCompanyGroups = query({
  args: { companyId: v.id("companies"), userId: v.optional(v.id("users")) },
  returns: v.array(v.object({
    _id: v.id("employeeGroups"),
    name: v.string(),
    description: v.optional(v.string()),
    memberCount: v.number(),
  })),
  async handler(ctx, args) {
    if (!args.userId) return [];
    await requireCompanyMember(ctx, args.userId, args.companyId, ["manager"]);
    const groups = await ctx.db
      .query("employeeGroups")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return groups.map(g => ({
      _id: g._id,
      name: g.name,
      description: g.description,
      memberCount: employees.filter(e => e.groupIds?.includes(g._id)).length,
    }));
  },
});

// Add employee to group
export const addEmployeeToGroup = mutation({
  args: {
    employeeId: v.id("users"),
    groupId: v.id("employeeGroups"),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  async handler(ctx, args) {
    if (!args.userId) throw new Error("Authentication required");
    const employee = await ctx.db.get(args.employeeId);
    if (!employee) throw new Error("Employee not found");
    if (!employee.companyId) throw new Error("Employee does not belong to a company");
    await requireCompanyManager(ctx, args.userId, employee.companyId);

    const currentGroups = employee.groupIds || [];
    if (!currentGroups.includes(args.groupId)) {
      await ctx.db.patch(args.employeeId, {
        groupIds: [...currentGroups, args.groupId],
        updatedAt: Date.now(),
      });
    }
    return null;
  },
});

// Get active invite codes for company
export const getCompanyInviteCodes = query({
  args: { companyId: v.id("companies"), userId: v.optional(v.id("users")) },
  returns: v.array(v.object({
    _id: v.id("inviteCodes"),
    code: v.string(),
    isUsed: v.boolean(),
    expiresAt: v.number(),
    groupId: v.optional(v.id("employeeGroups")),
  })),
  async handler(ctx, args) {
    if (!args.userId) return [];
    await requireCompanyMember(ctx, args.userId, args.companyId, ["manager"]);
    const codes = await ctx.db
      .query("inviteCodes")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    return codes
      .filter(c => !c.isUsed && c.expiresAt > Date.now())
      .map(c => ({
        _id: c._id,
        code: c.code,
        isUsed: c.isUsed,
        expiresAt: c.expiresAt,
        groupId: c.groupId,
      }));
  },
});

// Join company with invite code (for existing employees without a company)
export const joinCompanyWithCode = mutation({
  args: {
    userId: v.id("users"),
    inviteCode: v.string(),
  },
  returns: v.object({
    companyId: v.id("companies"),
    companyName: v.string(),
  }),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");

    // Find invite code
    const invite = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.inviteCode.toUpperCase()))
      .first();

    if (!invite) throw new Error("Invalid invite code");
    if (invite.isUsed) throw new Error("Invite code already used");
    if (invite.expiresAt < Date.now()) throw new Error("Invite code expired");

    const company = await ctx.db.get(invite.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    // Check if user is already part of this company or a different one
    if (user.companyId && user.companyId.toString() !== invite.companyId.toString()) {
      const otherCompany = await ctx.db.get(user.companyId);
      throw new Error(`You are already part of ${otherCompany?.name || "a different company"}. You can only join one company.`);
    }

    // Prepare group IDs - if user already has groups, add the new one
    const currentGroups = user.groupIds || [];
    const newGroupIds = invite.groupId ? [invite.groupId] : [];
    const updatedGroupIds = invite.groupId
      ? Array.from(new Set([...currentGroups, invite.groupId]))
      : currentGroups;

    // If user doesn't have a company yet, assign them to this company
    const updates: any = {
      updatedAt: Date.now(),
    };

    if (!user.companyId) {
      updates.companyId = invite.companyId;
      updates.role = "employee";
    }

    // Always update groupIds
    updates.groupIds = updatedGroupIds;

    await ctx.db.patch(args.userId, updates);

    // Mark invite as used
    await ctx.db.patch(invite._id, { isUsed: true, usedBy: args.userId });

    // Only increment employee count if this is the first time joining the company
    if (!user.companyId) {
      await ctx.db.patch(invite.companyId, {
        employeeCount: company.employeeCount + 1,
        updatedAt: Date.now(),
      });
    }

    return { companyId: invite.companyId, companyName: company.name };
  },
});

// Get company feature toggles
export const getCompanyFeatures = query({
  args: { companyId: v.id("companies") },
  returns: v.object({
    wellnessEnabled: v.boolean(),
    conflictResolutionEnabled: v.boolean(),
    quizEnabled: v.boolean(),
  }),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    // For MVP: All features enabled by default
    // Once payment system is complete, check against company.planRef
    return {
      wellnessEnabled: true,
      conflictResolutionEnabled: true,
      quizEnabled: true,
    };
  },
});

// Get company quiz defaults
export const getCompanyQuizSettings = query({
  args: { companyId: v.id("companies") },
  returns: v.object({
    questionCount: v.number(),
    maxQuestionCount: v.number(),
    quizStyle: v.union(
      v.literal("original"),
      v.literal("scenario"),
      v.literal("truefalse"),
      v.literal("quickcheck")
    ),
  }),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");
    const maxQuestionCount = getQuizQuestionLimit(company);
    return {
      questionCount: Math.min(company.quizQuestionCount || 5, maxQuestionCount),
      maxQuestionCount,
      quizStyle: company.quizStyle || "original",
    };
  },
});

export const updateCompanyQuizSettings = mutation({
  args: {
    companyId: v.id("companies"),
    questionCount: v.number(),
    quizStyle: v.union(
      v.literal("original"),
      v.literal("scenario"),
      v.literal("truefalse"),
      v.literal("quickcheck")
    ),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  async handler(ctx, args) {
    if (!args.userId) {
      throw new Error("Authentication required");
    }
    await requireCompanyManager(ctx, args.userId, args.companyId);
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const maxQuestionCount = getQuizQuestionLimit(company);
    const normalizedCount = Math.max(3, Math.min(maxQuestionCount, Math.floor(args.questionCount)));
    await ctx.db.patch(args.companyId, {
      quizQuestionCount: normalizedCount,
      quizStyle: args.quizStyle,
      updatedAt: Date.now(),
    });
    return null;
  },
});

// Update company feature toggles
export const updateCompanyFeatures = mutation({
  args: {
    companyId: v.id("companies"),
    wellnessEnabled: v.optional(v.boolean()),
    conflictResolutionEnabled: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  async handler(ctx, args) {
    if (!args.userId) {
      throw new Error("Authentication required");
    }
    await requireCompanyManager(ctx, args.userId, args.companyId);
    const company = await ctx.db.get(args.companyId);
    if (!company) throw new Error("Company not found");

    const isPremiumPlan = company.planRef === "pro" || company.planRef === "enterprise";
    if (!isPremiumPlan) {
      throw new Error("Wellness Chat and Conflict Resolution are only available on Pro or Enterprise plans.");
    }

    const updates: any = { updatedAt: Date.now() };
    if (args.wellnessEnabled !== undefined) updates.wellnessEnabled = args.wellnessEnabled;
    if (args.conflictResolutionEnabled !== undefined) updates.conflictResolutionEnabled = args.conflictResolutionEnabled;
    await ctx.db.patch(args.companyId, updates);
    return null;
  },
});

// Get company branding
export const getCompanyBranding = query({
  args: { companyId: v.id("companies") },
  returns: v.union(
    v.object({
      logoUrl: v.optional(v.string()),
      primaryColor: v.string(),
      secondaryColor: v.string(),
      accentColor: v.string(),
      displayName: v.optional(v.string()),
      welcomeMessage: v.optional(v.string()),
      brandStatement: v.optional(v.string()),
      supportEmail: v.optional(v.string()),
      supportPhone: v.optional(v.string()),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const branding = await ctx.db
      .query("companyBranding")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();
    if (!branding) return null;
    return {
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      secondaryColor: branding.secondaryColor,
      accentColor: branding.accentColor,
      displayName: branding.displayName,
      welcomeMessage: branding.welcomeMessage,
      brandStatement: branding.brandStatement,
      supportEmail: branding.supportEmail,
      supportPhone: branding.supportPhone,
    };
  },
});

// Update company branding
export const updateCompanyBranding = mutation({
  args: {
    companyId: v.id("companies"),
    logoUrl: v.optional(v.string()),
    primaryColor: v.optional(v.string()),
    secondaryColor: v.optional(v.string()),
    accentColor: v.optional(v.string()),
    displayName: v.optional(v.string()),
    welcomeMessage: v.optional(v.string()),
    brandStatement: v.optional(v.string()),
    supportEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("companyBranding")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .first();

    const { companyId, ...fields } = args;
    const now = Date.now();

    if (existing) {
      const updates: any = { updatedAt: now };
      if (fields.logoUrl !== undefined) updates.logoUrl = fields.logoUrl;
      if (fields.primaryColor !== undefined) updates.primaryColor = fields.primaryColor;
      if (fields.secondaryColor !== undefined) updates.secondaryColor = fields.secondaryColor;
      if (fields.accentColor !== undefined) updates.accentColor = fields.accentColor;
      if (fields.displayName !== undefined) updates.displayName = fields.displayName;
      if (fields.welcomeMessage !== undefined) updates.welcomeMessage = fields.welcomeMessage;
      if (fields.brandStatement !== undefined) updates.brandStatement = fields.brandStatement;
      if (fields.supportEmail !== undefined) updates.supportEmail = fields.supportEmail;
      if (fields.supportPhone !== undefined) updates.supportPhone = fields.supportPhone;
      await ctx.db.patch(existing._id, updates);
    } else {
      await ctx.db.insert("companyBranding", {
        companyId,
        primaryColor: fields.primaryColor || "#3B82F6",
        secondaryColor: fields.secondaryColor || "#8B5CF6",
        accentColor: fields.accentColor || "#F59E0B",
        logoUrl: fields.logoUrl,
        displayName: fields.displayName,
        welcomeMessage: fields.welcomeMessage,
        brandStatement: fields.brandStatement,
        supportEmail: fields.supportEmail,
        supportPhone: fields.supportPhone,
        createdAt: now,
        updatedAt: now,
      });
    }
    return null;
  },
});

// Public account stats for the login screen / demo view
export const getPublicAccountStats = query({
  args: {},
  returns: v.object({
    totalAccounts: v.number(),
    admins: v.number(),
    managers: v.number(),
    employees: v.number(),
  }),
  async handler(ctx) {
    const users = await ctx.db.query("users").collect();
    let admins = 0;
    let managers = 0;
    let employees = 0;

    for (const user of users) {
      if (user.role === "admin") admins += 1;
      else if (user.role === "manager") managers += 1;
      else if (user.role === "employee") employees += 1;
    }

    return {
      totalAccounts: users.length,
      admins,
      managers,
      employees,
    };
  },
});

// Seed demo accounts so published testers have known login details
export const ensureDemoAccounts = mutation({
  args: {},
  returns: v.object({
    adminEmail: v.string(),
    managerEmail: v.string(),
    employeeEmail: v.string(),
    password: v.string(),
  }),
  async handler(ctx) {
    const password = "Demo1234!";
    const now = Date.now();

    const existingAdmin = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "admin@demo.app"))
      .first();

    if (!existingAdmin) {
      await ctx.db.insert("users", {
        email: "admin@demo.app",
        password: hashPassword(password),
        fullName: "Demo Admin",
        role: "admin",
        createdAt: now,
        updatedAt: now,
      });
    }

    let managerUser = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "manager@demo.app"))
      .first();

    if (!managerUser) {
      const managerUserId = await ctx.db.insert("users", {
        email: "manager@demo.app",
        password: hashPassword(password),
        fullName: "Demo Manager",
        role: "manager",
        createdAt: now,
        updatedAt: now,
      });

      const companyId = await ctx.db.insert("companies", {
        name: "Demo Training Company",
        managerId: managerUserId,
        subscriptionStatus: "trial",
        trialEndsAt: now + 14 * 24 * 60 * 60 * 1000,
        employeeCount: 1,
        quizQuestionCount: 5,
        quizStyle: "original",
        createdAt: now,
        updatedAt: now,
      });

      await ctx.db.patch(managerUserId, { companyId });
      managerUser = await ctx.db.get(managerUserId);
    } else if (!managerUser.companyId) {
      const companyId = await ctx.db.insert("companies", {
        name: "Demo Training Company",
        managerId: managerUser._id,
        subscriptionStatus: "trial",
        trialEndsAt: now + 14 * 24 * 60 * 60 * 1000,
        employeeCount: 1,
        quizQuestionCount: 5,
        quizStyle: "original",
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(managerUser._id, { companyId, updatedAt: now });
      managerUser = await ctx.db.get(managerUser._id);
    }

    if (!managerUser || !managerUser.companyId) {
      throw new Error("Failed to create demo manager account");
    }

    const demoCompany = await ctx.db.get(managerUser.companyId);
    if (!demoCompany) {
      throw new Error("Failed to create demo company");
    }

    const existingEmployee = await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", "employee@demo.app"))
      .first();

    if (!existingEmployee) {
      await ctx.db.insert("users", {
        email: "employee@demo.app",
        password: hashPassword(password),
        fullName: "Demo Employee",
        role: "employee",
        companyId: demoCompany._id,
        groupIds: [],
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(demoCompany._id, {
        employeeCount: demoCompany.employeeCount + 1,
        updatedAt: now,
      });
    }

    const existingPolicy = await ctx.db
      .query("policies")
      .withIndex("by_company", (q) => q.eq("companyId", demoCompany._id))
      .first();

    if (!existingPolicy) {
      await ctx.db.insert("policies", {
        title: "Demo Workplace Safety Policy",
        description: "Sample policy for testers",
        content:
          "All workers must follow site safety procedures, report incidents immediately, and complete their training quizzes each day.",
        fileType: "txt",
        fileUrl: "demo-policy",
        companyId: demoCompany._id,
        uploadedBy: managerUser._id,
        policyType: "general",
        version: 1,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      });
    }

    return {
      adminEmail: "admin@demo.app",
      managerEmail: "manager@demo.app",
      employeeEmail: "employee@demo.app",
      password,
    };
  },
});

// Self-service account deletion
export const deleteMyAccount = mutation({
  args: {
    userId: v.id("users"),
  },
  returns: v.object({
    deleted: v.boolean(),
    message: v.string(),
  }),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) {
      return { deleted: true, message: "Account not found or already deleted." };
    }

    const deleteMany = async (rows: Array<{ _id: any }>) => {
      for (const row of rows) {
        try {
          await ctx.db.delete(row._id);
        } catch (e) {
          console.log("Error deleting record:", e);
        }
      }
    };

    const runCleanup = async (label: string, task: () => Promise<void>) => {
      try {
        await task();
      } catch (e) {
        console.log(`Error deleting ${label}:`, e);
      }
    };

    // Delete user data while PRESERVING reseller links
    // This is best-effort cleanup so the account record is always removed,
    // allowing the same email to be used again after deletion.
    await runCleanup("quiz notifications", async () => {
      await deleteMany(
        await ctx.db.query("quizNotifications").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()
      );
    });

    await runCleanup("daily quiz attempts", async () => {
      await deleteMany(
        await ctx.db.query("dailyQuizAttempts").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()
      );
    });

    await runCleanup("script read status", async () => {
      await deleteMany(
        await ctx.db.query("scriptReadStatus").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()
      );
    });

    await runCleanup("support messages", async () => {
      await deleteMany(
        await ctx.db.query("supportMessages").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()
      );
    });

    await runCleanup("saved judgments", async () => {
      await deleteMany(
        await ctx.db.query("savedJudgments").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()
      );
    });

    await runCleanup("conflict parties", async () => {
      await deleteMany(
        await ctx.db.query("conflictParties").withIndex("by_user", (q) => q.eq("userId", args.userId)).collect()
      );
    });

    await runCleanup("direct messages", async () => {
      const directMessages = await ctx.db.query("directMessages").collect();
      await deleteMany(
        directMessages.filter((message) => message.fromUserId === args.userId || message.toUserId === args.userId)
      );
    });

    await runCleanup("chat history", async () => {
      const chatHistory = await ctx.db.query("chatMessages").collect();
      await deleteMany(chatHistory.filter((item) => item.userId === args.userId));
    });

    await runCleanup("policy acknowledgments", async () => {
      const policyAcks = await ctx.db.query("policyAcknowledgments").collect();
      await deleteMany(policyAcks.filter((ack) => ack.employeeId === args.userId));
    });

    await runCleanup("quiz attempts", async () => {
      const quizAttempts = await ctx.db.query("quizAttempts").collect();
      await deleteMany(quizAttempts.filter((attempt) => attempt.employeeId === args.userId));
    });

    await runCleanup("quiz responses", async () => {
      const quizResponses = await ctx.db.query("quizResponses").collect();
      await deleteMany(quizResponses.filter((response) => response.employeeId === args.userId));
    });

    await runCleanup("compliance reports", async () => {
      const complianceReports = await ctx.db.query("complianceReports").collect();
      await deleteMany(
        complianceReports.filter((report) => report.employeeId === args.userId || report.generatedBy === args.userId)
      );
    });

    await runCleanup("conflict cases", async () => {
      const conflictCases = await ctx.db.query("conflictCases").collect();
      const casesToDelete = conflictCases.filter((c) => c.createdBy === args.userId);
      for (const caseDoc of casesToDelete) {
        const parties = await ctx.db.query("conflictParties").withIndex("by_case", (q) => q.eq("caseId", caseDoc._id)).collect();
        const statements = await ctx.db.query("conflictStatements").withIndex("by_case", (q) => q.eq("caseId", caseDoc._id)).collect();
        const witnesses = await ctx.db.query("conflictWitnesses").withIndex("by_case", (q) => q.eq("caseId", caseDoc._id)).collect();
        const evidence = await ctx.db.query("conflictEvidence").withIndex("by_case", (q) => q.eq("caseId", caseDoc._id)).collect();
        const judgments = await ctx.db.query("conflictJudgments").withIndex("by_case", (q) => q.eq("caseId", caseDoc._id)).collect();
        const saved = await ctx.db.query("savedJudgments").withIndex("by_case", (q) => q.eq("caseId", caseDoc._id)).collect();
        await deleteMany(parties);
        await deleteMany(statements);
        await deleteMany(witnesses);
        await deleteMany(evidence);
        await deleteMany(judgments);
        await deleteMany(saved);
        await ctx.db.delete(caseDoc._id);
      }
    });

    // PRESERVE: Reseller links - Do NOT delete from resellerCompanies table
    // This preserves affiliate/reseller relationships even after account deletion
    // Reseller commissions and links remain intact

    await runCleanup("user account", async () => {
      await ctx.db.delete(args.userId);
    });

    return {
      deleted: true,
      message: "Your account and all associated personal data have been deleted. Reseller and affiliate links have been preserved.",
    };
  },
});

// Auto-activate subscription from Google Play purchase
export const setCompanyPlanFromPurchase = mutation({
  args: {
    companyId: v.id("companies"),
    purchasedPackageId: v.string(),
  },
  returns: v.object({
    success: v.boolean(),
    planRef: v.string(),
    activatedAt: v.number(),
  }),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const normalized = args.purchasedPackageId.toLowerCase();
    let planRef: "starter" | "pro" | "enterprise" | null = null;

    if (normalized.includes("enterprise")) {
      planRef = "enterprise";
    } else if (normalized.includes("pro") || normalized.includes("professional")) {
      planRef = "pro";
    } else if (normalized.includes("starter")) {
      planRef = "starter";
    }

    if (!planRef) {
      throw new Error(`Unknown package: ${args.purchasedPackageId}`);
    }

    // Calculate 30-day renewal date
    const now = Date.now();
    const paymentDueDate = now + 30 * 24 * 60 * 60 * 1000;

    // Activate subscription immediately - NO admin approval needed
    await ctx.db.patch(args.companyId, {
      planRef,
      subscriptionStatus: "active",
      lastPaymentDate: now,
      paymentDueDate,
      updatedAt: now,
    });

    return {
      success: true,
      planRef,
      activatedAt: now,
    };
  },
});

export default {
  signUp,
  signIn,
  getCurrentUser,
};