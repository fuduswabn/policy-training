import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Type definition for business hours
export interface BusinessHours {
  startHour: number; // 0-23, default 8
  endHour: number;   // 0-23, default 16
  timezone?: string; // e.g., "Africa/Johannesburg"
}

// Get company business hours
export const getCompanyBusinessHours = query({
  args: { companyId: v.id("companies") },
  returns: v.object({
    startHour: v.number(),
    endHour: v.number(),
    timezone: v.optional(v.string()),
    isCurrentlyOpen: v.boolean(),
  }),
  handler: async (ctx, { companyId }) => {
    const company = await ctx.db.get(companyId);
    if (!company) {
      throw new Error("Company not found");
    }

    const businessHours = company.businessHours || {
      startHour: 8,
      endHour: 16,
      timezone: "Africa/Johannesburg",
    };

    // Check if currently within business hours
    const now = new Date();
    const currentHour = now.getHours();
    const isOpen =
      currentHour >= businessHours.startHour &&
      currentHour < businessHours.endHour;

    return {
      startHour: businessHours.startHour,
      endHour: businessHours.endHour,
      timezone: businessHours.timezone || "Africa/Johannesburg",
      isCurrentlyOpen: isOpen,
    };
  },
});

// Update company business hours (manager only)
export const updateBusinessHours = mutation({
  args: {
    companyId: v.id("companies"),
    startHour: v.number(),
    endHour: v.number(),
    timezone: v.optional(v.string()),
  },
  returns: v.object({
    success: v.boolean(),
    message: v.string(),
  }),
  handler: async (
    ctx,
    { companyId, startHour, endHour, timezone }
  ) => {
    // Validate hours
    if (startHour < 0 || startHour > 23 || endHour < 0 || endHour > 23) {
      return {
        success: false,
        message: "Hours must be between 0-23",
      };
    }

    if (startHour >= endHour) {
      return {
        success: false,
        message: "Start hour must be before end hour",
      };
    }

    // Update company
    await ctx.db.patch(companyId, {
      businessHours: {
        startHour,
        endHour,
        timezone: timezone || "Africa/Johannesburg",
      },
      updatedAt: Date.now(),
    });

    return {
      success: true,
      message: `Business hours updated to ${startHour}:00 - ${endHour}:00`,
    };
  },
});