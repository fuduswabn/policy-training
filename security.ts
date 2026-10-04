import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

const AUTHORIZED_ADMIN_EMAIL = "lyfstylmanufactures@gmail.com";

export async function requireUser(ctx: any, userId: any) {
  const user = await ctx.db.get(userId);
  if (!user) {
    throw new Error("User not found");
  }
  return user;
}

export async function requireCompanyMember(ctx: any, userId: any, companyId: any, allowedRoles?: string[]) {
  const user = await requireUser(ctx, userId);

  if (user.role === "admin") {
    return user;
  }

  if (user.companyId?.toString() !== companyId.toString()) {
    throw new Error("Access denied: this account cannot access another company's data.");
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    throw new Error("Access denied: insufficient permissions.");
  }

  return user;
}

export async function requireCompanyManager(ctx: any, userId: any, companyId: any) {
  const user = await requireCompanyMember(ctx, userId, companyId, ["manager", "hr_manager"]);
  if (user.role !== "manager" && user.role !== "hr_manager") {
    throw new Error("Access denied: manager or HR access required.");
  }
  return user;
}

export async function requireAdminUser(ctx: any, userId: any) {
  const user = await requireUser(ctx, userId);
  if (user.email !== AUTHORIZED_ADMIN_EMAIL || user.role !== "admin") {
    throw new Error("Unauthorized: admin access required.");
  }
  return user;
}

// Account type validation - prevents demo and real accounts from accessing each other
export const validateAccountAccess = mutation({
  args: { accountType: v.string() }, // 'demo' or 'real'
  handler: async (ctx, { accountType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("Not authenticated");
    
    const userEmail = identity.email || '';
    const isDemo = userEmail.includes('@demo.app');
    const requestedType = accountType;
    
    // Block access if account type mismatch
    if ((isDemo && requestedType === 'real') || (!isDemo && requestedType === 'demo')) {
      throw new Error(`Access Denied: ${isDemo ? 'Demo' : 'Real'} account cannot access ${requestedType} dashboard`);
    }
    
    return { allowed: true, accountType: isDemo ? 'demo' : 'real' };
  }
});

// Check if user can access a specific dashboard
export const canAccessDashboard = query({
  args: { dashboardType: v.string() }, // 'demo' or 'real'
  handler: async (ctx, { dashboardType }) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return { allowed: false, reason: "Not authenticated" };
    
    const userEmail = identity.email || '';
    const isDemoAccount = userEmail.includes('@demo.app');
    
    if (isDemoAccount && dashboardType === 'real') {
      return { allowed: false, reason: "Demo accounts cannot access real admin dashboard" };
    }
    
    if (!isDemoAccount && dashboardType === 'demo') {
      return { allowed: false, reason: "Real accounts cannot access demo dashboard" };
    }
    
    return { allowed: true };
  }
});
