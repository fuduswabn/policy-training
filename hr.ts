import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireCompanyManager, requireCompanyMember } from "./security";

// DEPARTMENTS MANAGEMENT ───────────────────────────────────────────────

export const createDepartment = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    headId: v.optional(v.id("users")),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    departmentId: v.id("departments"),
    name: v.string(),
  }),
  async handler(ctx, args) {
    if (!args.userId) throw new Error("Authentication required");
    await requireCompanyManager(ctx, args.userId, args.companyId);

    const departmentId = await ctx.db.insert("departments", {
      companyId: args.companyId,
      name: args.name,
      description: args.description,
      headId: args.headId,
      isActive: true,
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { departmentId, name: args.name };
  },
});

export const getDepartments = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
  },
  returns: v.array(
    v.object({
      _id: v.id("departments"),
      name: v.string(),
      description: v.optional(v.string()),
      headName: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  async handler(ctx, args) {
    if (!args.userId) return [];
    await requireCompanyManager(ctx, args.userId, args.companyId);

    const departments = await ctx.db
      .query("departments")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const result = [];
    for (const dept of departments) {
      let headName: string | undefined;
      if (dept.headId) {
        const head = await ctx.db.get(dept.headId);
        headName = head?.fullName;
      }
      result.push({
        _id: dept._id,
        name: dept.name,
        description: dept.description,
        headName,
        isActive: dept.isActive,
        createdAt: dept.createdAt,
      });
    }

    return result;
  },
});

export const updateDepartment = mutation({
  args: {
    departmentId: v.id("departments"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    headId: v.optional(v.id("users")),
    isActive: v.optional(v.boolean()),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  async handler(ctx, args) {
    if (!args.userId) throw new Error("Authentication required");
    const dept = await ctx.db.get(args.departmentId);
    if (!dept) throw new Error("Department not found");
    await requireCompanyManager(ctx, args.userId, dept.companyId);

    const updates: any = { updatedAt: Date.now() };
    if (args.name !== undefined) updates.name = args.name;
    if (args.description !== undefined) updates.description = args.description;
    if (args.headId !== undefined) updates.headId = args.headId;
    if (args.isActive !== undefined) updates.isActive = args.isActive;

    await ctx.db.patch(args.departmentId, updates);
    return null;
  },
});

// SITES MANAGEMENT ────────────────────────────────────────────────────

export const createSite = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    description: v.optional(v.string()),
    managerId: v.optional(v.id("users")),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    siteId: v.id("sites"),
    name: v.string(),
  }),
  async handler(ctx, args) {
    if (!args.userId) throw new Error("Authentication required");
    await requireCompanyManager(ctx, args.userId, args.companyId);

    const siteId = await ctx.db.insert("sites", {
      companyId: args.companyId,
      name: args.name,
      address: args.address,
      city: args.city,
      country: args.country,
      description: args.description,
      managerId: args.managerId,
      isActive: true,
      createdBy: args.userId,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { siteId, name: args.name };
  },
});

export const getSites = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
  },
  returns: v.array(
    v.object({
      _id: v.id("sites"),
      name: v.string(),
      city: v.optional(v.string()),
      country: v.optional(v.string()),
      managerName: v.optional(v.string()),
      isActive: v.boolean(),
      createdAt: v.number(),
    })
  ),
  async handler(ctx, args) {
    if (!args.userId) return [];
    await requireCompanyMember(ctx, args.userId, args.companyId, ["manager", "hr_manager", "hr_officer"]);

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const result = [];
    for (const site of sites) {
      let managerName: string | undefined;
      if (site.managerId) {
        const manager = await ctx.db.get(site.managerId);
        managerName = manager?.fullName;
      }
      result.push({
        _id: site._id,
        name: site.name,
        city: site.city,
        country: site.country,
        managerName,
        isActive: site.isActive,
        createdAt: site.createdAt,
      });
    }

    return result;
  },
});

// EMPLOYEE PROFILES ───────────────────────────────────────────────────

export const createEmployeeProfile = mutation({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
    departmentId: v.optional(v.id("departments")),
    siteId: v.optional(v.id("sites")),
    jobPosition: v.optional(v.string()),
    managerId: v.optional(v.id("users")),
    startDate: v.optional(v.number()),
    employmentType: v.optional(v.union(
      v.literal("full_time"),
      v.literal("part_time"),
      v.literal("contract"),
      v.literal("temporary")
    )),
    createdBy: v.optional(v.id("users")),
  },
  returns: v.object({
    profileId: v.id("employeeProfiles"),
  }),
  async handler(ctx, args) {
    const createdBy = args.createdBy || args.userId;
    if (!createdBy) throw new Error("Creator required");

    // Check if profile already exists
    const existing = await ctx.db
      .query("employeeProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      throw new Error("Employee profile already exists for this user");
    }

    const profileId = await ctx.db.insert("employeeProfiles", {
      userId: args.userId,
      companyId: args.companyId,
      departmentId: args.departmentId,
      siteId: args.siteId,
      jobPosition: args.jobPosition,
      managerId: args.managerId,
      startDate: args.startDate,
      employmentType: args.employmentType,
      status: "active",
      isActive: true,
      createdBy,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { profileId };
  },
});

export const getEmployeeProfile = query({
  args: {
    userId: v.id("users"),
  },
  returns: v.union(
    v.object({
      _id: v.id("employeeProfiles"),
      fullName: v.string(),
      email: v.string(),
      departmentName: v.optional(v.string()),
      siteName: v.optional(v.string()),
      jobPosition: v.optional(v.string()),
      managerName: v.optional(v.string()),
      startDate: v.optional(v.number()),
      employmentType: v.optional(v.string()),
      status: v.string(),
    }),
    v.null()
  ),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const profile = await ctx.db
      .query("employeeProfiles")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (!profile) return null;

    let departmentName: string | undefined;
    let siteName: string | undefined;
    let managerName: string | undefined;

    if (profile.departmentId) {
      const dept = await ctx.db.get(profile.departmentId);
      departmentName = dept?.name;
    }

    if (profile.siteId) {
      const site = await ctx.db.get(profile.siteId);
      siteName = site?.name;
    }

    if (profile.managerId) {
      const manager = await ctx.db.get(profile.managerId);
      managerName = manager?.fullName;
    }

    return {
      _id: profile._id,
      fullName: user.fullName,
      email: user.email,
      departmentName,
      siteName,
      jobPosition: profile.jobPosition,
      managerName,
      startDate: profile.startDate,
      employmentType: profile.employmentType,
      status: profile.status,
    };
  },
});

export const getCompanyEmployeesWithProfiles = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
  },
  returns: v.array(
    v.object({
      _id: v.id("users"),
      fullName: v.string(),
      email: v.string(),
      departmentName: v.optional(v.string()),
      siteName: v.optional(v.string()),
      jobPosition: v.optional(v.string()),
      managerName: v.optional(v.string()),
      status: v.string(),
      startDate: v.optional(v.number()),
    })
  ),
  async handler(ctx, args) {
    if (!args.userId) return [];
    await requireCompanyMember(ctx, args.userId, args.companyId, ["manager", "hr_manager", "hr_officer"]);

    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const result = [];
    for (const emp of employees) {
      if (emp.role !== "employee") continue;

      const profile = await ctx.db
        .query("employeeProfiles")
        .withIndex("by_user", (q) => q.eq("userId", emp._id))
        .first();

      let departmentName: string | undefined;
      let siteName: string | undefined;
      let managerName: string | undefined;

      if (profile) {
        if (profile.departmentId) {
          const dept = await ctx.db.get(profile.departmentId);
          departmentName = dept?.name;
        }
        if (profile.siteId) {
          const site = await ctx.db.get(profile.siteId);
          siteName = site?.name;
        }
        if (profile.managerId) {
          const manager = await ctx.db.get(profile.managerId);
          managerName = manager?.fullName;
        }
      }

      result.push({
        _id: emp._id,
        fullName: emp.fullName,
        email: emp.email,
        departmentName,
        siteName,
        jobPosition: profile?.jobPosition,
        managerName,
        status: profile?.status || "active",
        startDate: profile?.startDate,
      });
    }

    return result;
  },
});

export const updateEmployeeProfile = mutation({
  args: {
    profileId: v.id("employeeProfiles"),
    departmentId: v.optional(v.id("departments")),
    siteId: v.optional(v.id("sites")),
    jobPosition: v.optional(v.string()),
    managerId: v.optional(v.id("users")),
    status: v.optional(v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_leave"),
      v.literal("suspended")
    )),
    userId: v.optional(v.id("users")),
  },
  returns: v.null(),
  async handler(ctx, args) {
    if (!args.userId) throw new Error("Authentication required");
    const profile = await ctx.db.get(args.profileId);
    if (!profile) throw new Error("Profile not found");
    await requireCompanyManager(ctx, args.userId, profile.companyId);

    const updates: any = { updatedAt: Date.now() };
    if (args.departmentId !== undefined) updates.departmentId = args.departmentId;
    if (args.siteId !== undefined) updates.siteId = args.siteId;
    if (args.jobPosition !== undefined) updates.jobPosition = args.jobPosition;
    if (args.managerId !== undefined) updates.managerId = args.managerId;
    if (args.status !== undefined) updates.status = args.status;

    await ctx.db.patch(args.profileId, updates);
    return null;
  },
});

// HR DASHBOARD STATS ───────────────────────────────────────────────────

export const getHRDashboardStats = query({
  args: {
    companyId: v.id("companies"),
    userId: v.optional(v.id("users")),
  },
  returns: v.object({
    totalEmployees: v.number(),
    activeEmployees: v.number(),
    departmentCount: v.number(),
    siteCount: v.number(),
    onLeaveCount: v.number(),
    newHiresThisMonth: v.number(),
    departmentBreakdown: v.array(v.object({
      departmentName: v.string(),
      employeeCount: v.number(),
    })),
  }),
  async handler(ctx, args) {
    if (!args.userId) {
      return {
        totalEmployees: 0,
        activeEmployees: 0,
        departmentCount: 0,
        siteCount: 0,
        onLeaveCount: 0,
        newHiresThisMonth: 0,
        departmentBreakdown: [],
      };
    }
    await requireCompanyMember(ctx, args.userId, args.companyId, ["manager", "hr_manager"]);

    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const companyEmployees = employees.filter((e: any) => e.role === "employee");
    const totalEmployees = companyEmployees.length;

    const departments = await ctx.db
      .query("departments")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const departmentCount = departments.filter((d: any) => d.isActive).length;

    const sites = await ctx.db
      .query("sites")
      .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
      .collect();

    const siteCount = sites.filter((s: any) => s.isActive).length;

    let activeEmployees = 0;
    let onLeaveCount = 0;
    let newHiresThisMonth = 0;
    const departmentMap = new Map<string, number>();

    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;

    for (const emp of companyEmployees) {
      const profile = await ctx.db
        .query("employeeProfiles")
        .withIndex("by_user", (q) => q.eq("userId", emp._id))
        .first();

      if (profile) {
        if (profile.status === "active") activeEmployees += 1;
        if (profile.status === "on_leave") onLeaveCount += 1;
        if (profile.startDate && profile.startDate > monthAgo) newHiresThisMonth += 1;

        if (profile.departmentId) {
          const dept = await ctx.db.get(profile.departmentId);
          if (dept) {
            departmentMap.set(
              dept.name,
              (departmentMap.get(dept.name) || 0) + 1
            );
          }
        }
      }
    }

    const departmentBreakdown = Array.from(departmentMap.entries()).map(([name, count]) => ({
      departmentName: name,
      employeeCount: count,
    }));

    return {
      totalEmployees,
      activeEmployees,
      departmentCount,
      siteCount,
      onLeaveCount,
      newHiresThisMonth,
      departmentBreakdown,
    };
  },
});