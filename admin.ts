import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// Only this email is authorized to be admin
const AUTHORIZED_ADMIN_EMAIL = "lyfstylmanufactures@gmail.com";

// Check if user is the authorized admin
export const isAuthorizedAdmin = query({
  args: { userId: v.id("users") },
  returns: v.boolean(),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) return false;
    
    // Only the authorized email can be admin
    return user.email === AUTHORIZED_ADMIN_EMAIL && user.role === "admin";
  },
});

// Verify admin access (throws error if not authorized)
export const verifyAdminAccess = query({
  args: { userId: v.id("users") },
  returns: v.object({
    isAdmin: v.boolean(),
    adminEmail: v.string(),
  }),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    
    const isAdmin = user.email === AUTHORIZED_ADMIN_EMAIL && user.role === "admin";
    
    if (!isAdmin) {
      throw new Error("Unauthorized: Admin access required");
    }
    
    return {
      isAdmin: true,
      adminEmail: AUTHORIZED_ADMIN_EMAIL,
    };
  },
});

// Get authorized admin email (public - just returns the email)
export const getAuthorizedAdminEmail = query({
  args: {},
  returns: v.string(),
  handler: async () => {
    return AUTHORIZED_ADMIN_EMAIL;
  },
});

export default {
  isAuthorizedAdmin,
  verifyAdminAccess,
  getAuthorizedAdminEmail,
};
