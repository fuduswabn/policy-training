import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { api } from "./_generated/api";

// Create inspection template
export const createTemplate = mutation({
  args: {
    companyId: v.id("companies"),
    name: v.string(),
    category: v.union(
      v.literal("vehicle"),
      v.literal("equipment"),
      v.literal("tools"),
      v.literal("workplace"),
      v.literal("ppe"),
      v.literal("safety"),
      v.literal("site"),
      v.literal("home_equipment"),
      v.literal("custom")
    ),
    description: v.optional(v.string()),
    checklist: v.array(v.object({
      id: v.string(),
      item: v.string(),
      required: v.boolean(),
      requiresComment: v.boolean(),
      requiresPhoto: v.boolean(),
    })),
    userId: v.id("users"),
  },
  returns: v.id("inspectionTemplates"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("inspectionTemplates", {
      companyId: args.companyId,
      name: args.name,
      category: args.category,
      description: args.description,
      checklist: args.checklist,
      createdBy: args.userId,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get templates for company
export const getTemplates = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("inspectionTemplates"),
    name: v.string(),
    category: v.string(),
    description: v.optional(v.string()),
    checklist: v.array(v.any()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })),
  handler: async (ctx: any, args: any) => {
    const templates = await ctx.db
      .query("inspectionTemplates")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();
    return templates.map((t: any) => ({
      _id: t._id,
      name: t.name,
      category: t.category,
      description: t.description,
      checklist: t.checklist,
      isActive: t.isActive,
      createdAt: t.createdAt,
    }));
  },
});

// Create vehicle profile
export const createVehicle = mutation({
  args: {
    companyId: v.id("companies"),
    registration: v.string(),
    fleetNumber: v.optional(v.string()),
    vehicleType: v.string(),
    make: v.string(),
    model: v.string(),
    year: v.number(),
    driverId: v.optional(v.id("users")),
    department: v.optional(v.string()),
    site: v.optional(v.string()),
    currentMileage: v.number(),
    userId: v.id("users"),
  },
  returns: v.id("vehicleProfiles"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("vehicleProfiles", {
      companyId: args.companyId,
      registration: args.registration,
      fleetNumber: args.fleetNumber,
      vehicleType: args.vehicleType,
      make: args.make,
      model: args.model,
      year: args.year,
      driverId: args.driverId,
      department: args.department,
      site: args.site,
      currentMileage: args.currentMileage,
      notes: undefined,
      isActive: true,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get vehicles for company
export const getVehicles = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.object({
    _id: v.id("vehicleProfiles"),
    registration: v.string(),
    fleetNumber: v.optional(v.string()),
    vehicleType: v.string(),
    make: v.string(),
    model: v.string(),
    currentMileage: v.number(),
    isActive: v.boolean(),
  })),
  handler: async (ctx: any, args: any) => {
    const vehicles = await ctx.db
      .query("vehicleProfiles")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();
    return vehicles.map((v: any) => ({
      _id: v._id,
      registration: v.registration,
      fleetNumber: v.fleetNumber,
      vehicleType: v.vehicleType,
      make: v.make,
      model: v.model,
      currentMileage: v.currentMileage,
      isActive: v.isActive,
    }));
  },
});

// Create asset
export const createAsset = mutation({
  args: {
    companyId: v.id("companies"),
    assetId: v.string(),
    name: v.string(),
    category: v.string(),
    location: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    userId: v.id("users"),
  },
  returns: v.id("assetProfiles"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("assetProfiles", {
      companyId: args.companyId,
      assetId: args.assetId,
      name: args.name,
      category: args.category,
      location: args.location,
      assignedTo: args.assignedTo,
      purchaseDate: undefined,
      warrantyExpiry: undefined,
      condition: "good",
      notes: undefined,
      isActive: true,
      createdBy: args.userId,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Create inspection
export const createInspection = mutation({
  args: {
    companyId: v.id("companies"),
    templateId: v.id("inspectionTemplates"),
    inspectorId: v.id("users"),
    assetType: v.union(v.literal("vehicle"), v.literal("asset"), v.literal("general")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    location: v.optional(v.string()),
    mileage: v.optional(v.number()),
    checklist: v.array(v.object({
      itemId: v.string(),
      item: v.string(),
      status: v.union(v.literal("pass"), v.literal("fail"), v.literal("na")),
      comment: v.optional(v.string()),
    })),
    overallCondition: v.union(v.literal("pass"), v.literal("fail")),
    comments: v.optional(v.string()),
    isBaseline: v.boolean(),
    followUpActionRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
  },
  returns: v.id("inspections"),
  handler: async (ctx, args) => {
    const now = Date.now();
    const failedItems = args.checklist.filter(
      (item: { status: "pass" | "fail" | "na"; item: string }) => item.status === "fail"
    );
    const autoFollowUpNotes = failedItems.length > 0
      ? `Follow-up automatically required for failed item(s): ${failedItems.map((item: { item: string }) => item.item).join(", ")}.${args.comments ? ` ${args.comments}` : ""}`
      : args.followUpNotes;

    return await ctx.db.insert("inspections", {
      companyId: args.companyId,
      templateId: args.templateId,
      inspectorId: args.inspectorId,
      assetType: args.assetType,
      vehicleId: args.vehicleId,
      assetId: args.assetId,
      location: args.location,
      dateTime: now,
      mileage: args.mileage,
      checklist: args.checklist,
      overallCondition: args.overallCondition,
      comments: args.comments,
      isBaseline: args.isBaseline,
      followUpActionRequired: args.followUpActionRequired || failedItems.length > 0,
      followUpNotes: autoFollowUpNotes,
      status: "submitted",
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get inspection history for asset
export const getInspectionHistory = query({
  args: {
    assetType: v.union(v.literal("vehicle"), v.literal("asset")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
  },
  returns: v.array(v.object({
    _id: v.id("inspections"),
    dateTime: v.number(),
    overallCondition: v.string(),
    isBaseline: v.boolean(),
    status: v.string(),
  })),
  handler: async (ctx: any, args: any) => {
    let queryBuilder = ctx.db.query("inspections").withIndex("by_asset", (q: any) => {
      const indexed = q.eq("assetType", args.assetType);
      if (args.vehicleId) {
        return indexed.eq("vehicleId", args.vehicleId);
      }
      if (args.assetId) {
        return indexed.eq("assetId", args.assetId);
      }
      return indexed;
    });

    const inspections = await queryBuilder.collect();
    return inspections.map((i: any) => ({
      _id: i._id,
      dateTime: i.dateTime,
      overallCondition: i.overallCondition,
      isBaseline: i.isBaseline,
      status: i.status,
    }));
  },
});

// Get inspection details
export const getInspection = query({
  args: { inspectionId: v.id("inspections") },
  returns: v.object({
    _id: v.id("inspections"),
    templateId: v.id("inspectionTemplates"),
    inspectorId: v.id("users"),
    dateTime: v.number(),
    checklist: v.array(v.any()),
    overallCondition: v.string(),
    comments: v.optional(v.string()),
    followUpActionRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
    status: v.string(),
  }),
  handler: async (ctx, args) => {
    const inspection = await ctx.db.get(args.inspectionId);
    if (!inspection) {
      throw new Error("Inspection not found");
    }
    return {
      _id: inspection._id,
      templateId: inspection.templateId,
      inspectorId: inspection.inspectorId,
      dateTime: inspection.dateTime,
      checklist: inspection.checklist,
      overallCondition: inspection.overallCondition,
      comments: inspection.comments,
      followUpActionRequired: inspection.followUpActionRequired,
      followUpNotes: inspection.followUpNotes,
      status: inspection.status,
    };
  },
});

// Create baseline comparison (AI analysis placeholder)
export const createComparison = mutation({
  args: {
    companyId: v.id("companies"),
    assetId: v.id("assetProfiles"),
    baselineInspectionId: v.id("inspections"),
    currentInspectionId: v.id("inspections"),
    baselinePhotoId: v.id("inspectionPhotos"),
    currentPhotoId: v.id("inspectionPhotos"),
  },
  returns: v.id("baselineComparisons"),
  handler: async (ctx, args) => {
    const now = Date.now();
    // Start as pending, AI analysis would process this asynchronously
    return await ctx.db.insert("baselineComparisons", {
      companyId: args.companyId,
      assetId: args.assetId,
      baselineInspectionId: args.baselineInspectionId,
      currentInspectionId: args.currentInspectionId,
      analysisStatus: "pending",
      baselinePhotoId: args.baselinePhotoId,
      currentPhotoId: args.currentPhotoId,
      aiAnalysis: undefined,
      humanVerification: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get comparisons for asset
export const getComparisons = query({
  args: { assetId: v.id("assetProfiles") },
  returns: v.array(v.object({
    _id: v.id("baselineComparisons"),
    analysisStatus: v.string(),
    aiAnalysis: v.optional(v.any()),
    createdAt: v.number(),
  })),
  handler: async (ctx: any, args: any) => {
    const comparisons = await ctx.db
      .query("baselineComparisons")
      .withIndex("by_asset", (q: any) => q.eq("assetId", args.assetId))
      .collect();
    return comparisons.map((c: any) => ({
      _id: c._id,
      analysisStatus: c.analysisStatus,
      aiAnalysis: c.aiAnalysis,
      createdAt: c.createdAt,
    }));
  },
});

// AI-powered photo analysis using LLM API
export const analyzePhotos = action({
  args: {
    baselinePhotoUrl: v.string(),
    currentPhotoUrl: v.string(),
    assetType: v.string(),
    assetName: v.string(),
  },
  returns: v.object({
    damageFlagged: v.boolean(),
    visibleChanges: v.array(v.string()),
    missingComponents: v.array(v.string()),
    conditionAssessment: v.string(),
    confidence: v.number(),
    requiresHumanReview: v.boolean(),
    findings: v.string(),
  }),
  handler: async (args: any) => {
    try {
      const payload = {
        messages: [
          {
            role: "user",
            content: `You are an expert asset inspection AI. Compare two photos of a ${args.assetType} named "${args.assetName}".

BASELINE PHOTO URL: ${args.baselinePhotoUrl}
CURRENT PHOTO URL: ${args.currentPhotoUrl}

Analyze the photos and provide a structured comparison. Look for:
1. Visible damage or deterioration
2. Changes in condition
3. Missing or broken components
4. Rust, corrosion, or wear
5. Misalignment or structural issues

IMPORTANT: Do NOT make definitive safety or legal conclusions. Flag areas requiring human inspection instead.

Return your analysis in JSON format with these fields:
- damageFlagged (boolean): whether any damage or changes are visible
- visibleChanges (array of strings): list of visible changes observed
- missingComponents (array of strings): list of any missing or broken parts
- conditionAssessment (string): overall condition assessment (improved/same/deteriorated)
- confidence (number): confidence level 0-100
- requiresHumanReview (boolean): whether human inspection is needed
- findings (string): detailed findings text`,
          },
        ],
        schema: {
          type: "object",
          properties: {
            damageFlagged: { type: "boolean" },
            visibleChanges: { type: "array", items: { type: "string" } },
            missingComponents: { type: "array", items: { type: "string" } },
            conditionAssessment: { type: "string" },
            confidence: { type: "number" },
            requiresHumanReview: { type: "boolean" },
            findings: { type: "string" },
          },
          required: [
            "damageFlagged",
            "visibleChanges",
            "missingComponents",
            "conditionAssessment",
            "confidence",
            "requiresHumanReview",
            "findings",
          ],
        },
      };

      const response = await (globalThis.fetch as any)("https://api.a0.dev/ai/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.schema_data || (typeof data.completion === "string" ? JSON.parse(data.completion) : data.completion);

      return {
        damageFlagged: analysis.damageFlagged || false,
        visibleChanges: analysis.visibleChanges || [],
        missingComponents: analysis.missingComponents || [],
        conditionAssessment: analysis.conditionAssessment || "unknown",
        confidence: analysis.confidence || 0,
        requiresHumanReview: analysis.requiresHumanReview || true,
        findings: analysis.findings || "Analysis pending",
      };
    } catch (error: any) {
      console.error("Photo analysis error:", error);
      return {
        damageFlagged: false,
        visibleChanges: [],
        missingComponents: [],
        conditionAssessment: "analysis_failed",
        confidence: 0,
        requiresHumanReview: true,
        findings: "AI analysis could not be completed. Human review required.",
      };
    }
  },
});

// Update comparison with AI analysis results
export const updateComparisonWithAnalysis = mutation({
  args: {
    comparisonId: v.id("baselineComparisons"),
    analysis: v.object({
      damageFlagged: v.boolean(),
      visibleChanges: v.array(v.string()),
      missingComponents: v.array(v.string()),
      conditionAssessment: v.string(),
      confidence: v.number(),
      requiresHumanReview: v.boolean(),
      findings: v.string(),
    }),
  },
  returns: v.id("baselineComparisons"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.comparisonId, {
      aiAnalysis: args.analysis,
      analysisStatus: args.analysis.requiresHumanReview ? "pending_review" : "completed",
      updatedAt: Date.now(),
    });
    return args.comparisonId;
  },
});

// Approve/reject human verification
export const verifyComparison = mutation({
  args: {
    comparisonId: v.id("baselineComparisons"),
    verified: v.boolean(),
    verifiedBy: v.id("users"),
    verificationNotes: v.optional(v.string()),
  },
  returns: v.id("baselineComparisons"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.comparisonId, {
      humanVerification: {
        verified: args.verified,
        verifiedBy: args.verifiedBy,
        verificationNotes: args.verificationNotes,
        verifiedAt: Date.now(),
      },
      analysisStatus: "verified",
      updatedAt: Date.now(),
    });
    return args.comparisonId;
  },
});

export const generateInspectionPhotoUploadUrl = mutation({
  args: {},
  returns: v.string(),
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const getInspectionItemBaselines = query({
  args: {
    companyId: v.id("companies"),
    templateId: v.id("inspectionTemplates"),
    checklistItemIds: v.array(v.string()),
  },
  returns: v.array(v.object({
    checklistItemId: v.string(),
    itemName: v.string(),
    photoUrl: v.string(),
    photoUrls: v.array(v.string()),
    storageId: v.string(),
    uploadedAt: v.number(),
  })),
  handler: async (ctx, args) => {
    const baselines = [];

    for (const checklistItemId of args.checklistItemIds) {
      const baseline = await ctx.db
        .query("inspectionPhotos")
        .withIndex("by_company_template_item", (q: any) =>
          q.eq("companyId", args.companyId)
            .eq("templateId", args.templateId)
            .eq("checklistItemId", checklistItemId)
        )
        .order("asc")
        .take(1);

      if (baseline.length > 0) {
        const baselineInspectionId = baseline[0].inspectionId;
        const baselinePhotos = await ctx.db
          .query("inspectionPhotos")
          .withIndex("by_inspection_item", (q: any) =>
            q.eq("inspectionId", baselineInspectionId).eq("checklistItemId", checklistItemId)
          )
          .order("asc")
          .collect();

        baselines.push({
          checklistItemId,
          itemName: baseline[0].itemName,
          photoUrl: baseline[0].photoUrl,
          photoUrls: baselinePhotos.map((photo: any) => photo.photoUrl),
          storageId: baseline[0].storageId,
          uploadedAt: baseline[0].uploadedAt,
        });
      }
    }

    return baselines;
  },
});

// Save inspection photo with AI analysis
export const saveInspectionPhoto = mutation({
  args: {
    inspectionId: v.id("inspections"),
    companyId: v.id("companies"),
    templateId: v.id("inspectionTemplates"),
    checklistItemId: v.string(),
    itemName: v.string(),
    assetType: v.union(v.literal("vehicle"), v.literal("asset"), v.literal("general")),
    storageId: v.string(),
    isBaseline: v.boolean(),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    comment: v.optional(v.string()),
    caption: v.optional(v.string()),
    angle: v.optional(v.string()),
    order: v.optional(v.number()),
  },
  returns: v.object({
    _id: v.id("inspectionPhotos"),
    photoUrl: v.string(),
    checklistItemId: v.string(),
    itemName: v.string(),
    uploadedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const now = Date.now();
    const photoUrl = await ctx.storage.getUrl(args.storageId);
    if (!photoUrl) {
      throw new Error("Uploaded photo is not available");
    }

    const photoId = await ctx.db.insert("inspectionPhotos", {
      inspectionId: args.inspectionId,
      companyId: args.companyId,
      templateId: args.templateId,
      checklistItemId: args.checklistItemId,
      itemName: args.itemName,
      assetType: args.assetType,
      vehicleId: args.vehicleId,
      assetId: args.assetId,
      isBaseline: args.isBaseline,
      storageId: args.storageId,
      photoUrl,
      caption: args.caption,
      comment: args.comment,
      angle: args.angle,
      order: args.order || 0,
      uploadedAt: now,
    });

    return {
      _id: photoId,
      photoUrl,
      checklistItemId: args.checklistItemId,
      itemName: args.itemName,
      uploadedAt: now,
    };
  },
});

// Get previous photos for comparison
export const getPreviousPhotos = query({
  args: {
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    checklistItemId: v.string(),
    limit: v.optional(v.number()),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: any) => {
    const inspections = await ctx.db
      .query("inspections")
      .withIndex("by_asset", (q: any) => {
        const indexed = q.eq("assetType", args.vehicleId ? "vehicle" : "asset");
        if (args.vehicleId) {
          return indexed.eq("vehicleId", args.vehicleId);
        }
        if (args.assetId) {
          return indexed.eq("assetId", args.assetId);
        }
        return indexed;
      })
      .order("desc")
      .collect();

    const limit = args.limit || 3;
    const previousPhotos = [];
    const limit_count = Math.min(limit, inspections.length);

    for (let i = 0; i < limit_count; i++) {
      const photos = await ctx.db
        .query("inspectionPhotos")
        .withIndex("by_inspection_item", (q: any) => 
          q.eq("inspectionId", inspections[i]._id).eq("checklistItemId", args.checklistItemId)
        )
        .collect();
      
      if (photos.length > 0) {
        previousPhotos.push({
          _id: photos[0]._id,
          inspectionId: inspections[i]._id,
          photoUrl: photos[0].photoUrl,
          photoUrls: photos.map((photo: any) => photo.photoUrl),
          uploadedAt: photos[0].uploadedAt,
          comment: photos[0].comment,
        });
      }
    }

    return previousPhotos;
  },
});

// Compare current inspection with previous ones and flag issues
export const compareInspectionPhotos = action({
  args: {
    currentPhotoUrl: v.optional(v.string()),
    currentPhotoUrls: v.optional(v.array(v.string())),
    previousPhotoUrls: v.array(v.string()),
    checklistItemName: v.string(),
    assetName: v.string(),
  },
  returns: v.object({
    issuesDetected: v.boolean(),
    comparisonSummary: v.string(),
    changesFromPrevious: v.array(v.string()),
    aiRecommendation: v.string(),
    confidenceLevel: v.number(),
    requiresApproval: v.boolean(),
  }),
  handler: async (args: any) => {
    try {
      const currentPhotoUrls = args.currentPhotoUrls || (args.currentPhotoUrl ? [args.currentPhotoUrl] : []);
      const currentPhotosText = currentPhotoUrls
        .map((url: string, idx: number) => `CURRENT PHOTO ${idx + 1}: ${url}`)
        .join("\n");
      const previousPhotosText = args.previousPhotoUrls
        .map((url: string, idx: number) => `PREVIOUS/BASELINE PHOTO ${idx + 1}: ${url}`)
        .join("\n");

      const payload = {
        messages: [
          {
            role: "user",
            content: `You are an expert equipment inspection AI performing photo comparison moderation.

Asset: ${args.assetName}
Checklist Item: ${args.checklistItemName}

CURRENT PHOTOS (${currentPhotoUrls.length}):
${currentPhotosText || 'No current photos provided'}

${previousPhotosText}

Analyze all current photos together against the previous/baseline photos. Some checklist items have multiple similar parts, for example a vehicle may have several mirrors, tyres, lights, or panels. Do not rely on the inspector choosing the result manually. Use the evidence in every photo to recommend the item status.

Identify:
1. Changes in condition or appearance across all submitted photos
2. New damage, wear, or deterioration
3. Improvements or maintenance performed
4. Missing or unclear views where more photos may be needed
5. Any safety concerns or red flags
6. Whether this inspection should be flagged for manager review

IMPORTANT: Be thorough but fair. Small cosmetic changes are normal. Flag only if there are concerns. If multiple components are visible, compare each component separately where possible.

Return your analysis in JSON format with:
- issuesDetected (boolean): whether any concerning changes were detected
- comparisonSummary (string): brief summary of what changed
- changesFromPrevious (array): list of specific changes observed
- aiRecommendation (string): what action to take
- confidenceLevel (number): 0-100, your confidence in this analysis
- requiresApproval (boolean): whether this needs manager approval`,
          },
        ],
        schema: {
          type: "object",
          properties: {
            issuesDetected: { type: "boolean" },
            comparisonSummary: { type: "string" },
            changesFromPrevious: { type: "array", items: { type: "string" } },
            aiRecommendation: { type: "string" },
            confidenceLevel: { type: "number" },
            requiresApproval: { type: "boolean" },
          },
          required: [
            "issuesDetected",
            "comparisonSummary",
            "changesFromPrevious",
            "aiRecommendation",
            "confidenceLevel",
            "requiresApproval",
          ],
        },
      };

      const response = await (globalThis.fetch as any)("https://api.a0.dev/ai/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.schema_data || (typeof data.completion === "string" ? JSON.parse(data.completion) : data.completion);

      return {
        issuesDetected: analysis.issuesDetected || false,
        comparisonSummary: analysis.comparisonSummary || "No significant changes detected",
        changesFromPrevious: analysis.changesFromPrevious || [],
        aiRecommendation: analysis.aiRecommendation || "Inspection approved",
        confidenceLevel: analysis.confidenceLevel || 0,
        requiresApproval: analysis.requiresApproval || false,
      };
    } catch (error: any) {
      console.error("Photo comparison error:", error);
      return {
        issuesDetected: false,
        comparisonSummary: "Comparison could not be completed",
        changesFromPrevious: [],
        aiRecommendation: "Manual review required",
        confidenceLevel: 0,
        requiresApproval: true,
      };
    }
  },
});

export const analyzeChecklistItem = action({
  args: {
    itemName: v.string(),
    assetType: v.union(v.literal("vehicle"), v.literal("asset"), v.literal("general")),
    assetName: v.string(),
    comment: v.optional(v.string()),
    photoUrl: v.optional(v.string()),
    photoUrls: v.optional(v.array(v.string())),
  },
  returns: v.object({
    recommendedStatus: v.union(v.literal("pass"), v.literal("fail"), v.literal("na")),
    confidence: v.number(),
    summary: v.string(),
    recommendation: v.string(),
    requiresHumanReview: v.boolean(),
  }),
  handler: async (args: any) => {
    try {
      const photoUrls = args.photoUrls || (args.photoUrl ? [args.photoUrl] : []);
      const photosText = photoUrls
        .map((url: string, idx: number) => `PHOTO ${idx + 1}: ${url}`)
        .join("\n");

      const payload = {
        messages: [
          {
            role: "user",
            content: `You are an inspection AI helping a manager review one checklist item.

Asset type: ${args.assetType}
Asset name: ${args.assetName}
Checklist item: ${args.itemName}

User comment: ${args.comment || 'No comment provided'}
Submitted photos (${photoUrls.length}):
${photosText || 'No photo provided'}

Decide and recommend the best inspection status for this item from the submitted evidence. The inspector may provide more than one photo when an item has multiple components, such as three mirrors, multiple tyres, lights, panels, or tools. Review every photo together before recommending a status.

- pass = all visible required components look acceptable / no issue
- fail = any visible required component has a problem, defect, damage, or is missing
- na = not applicable, not present, or cannot be assessed from the evidence

Return JSON with:
- recommendedStatus: pass | fail | na
- confidence: 0-100
- summary: a short plain-English explanation for the manager, including which photo/component caused concern when relevant
- recommendation: the practical follow-up action if there is a defect or unclear evidence; otherwise say no follow-up needed
- requiresHumanReview: true if the evidence is unclear, incomplete, contradictory, or a safety-critical issue is visible`,
          },
        ],
        schema: {
          type: "object",
          properties: {
            recommendedStatus: { type: "string", enum: ["pass", "fail", "na"] },
            confidence: { type: "number" },
            summary: { type: "string" },
            recommendation: { type: "string" },
            requiresHumanReview: { type: "boolean" },
          },
          required: ["recommendedStatus", "confidence", "summary", "recommendation", "requiresHumanReview"],
        },
      };

      const response = await (globalThis.fetch as any)("https://api.a0.dev/ai/llm", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error(`LLM API error: ${response.status}`);
      }

      const data = await response.json();
      const analysis = data.schema_data || (typeof data.completion === "string" ? JSON.parse(data.completion) : data.completion);

      return {
        recommendedStatus: analysis.recommendedStatus || "na",
        confidence: analysis.confidence || 0,
        summary: analysis.summary || "AI analysis unavailable",
        recommendation: analysis.recommendation || "Manager review recommended",
        requiresHumanReview: analysis.requiresHumanReview ?? true,
      };
    } catch (error: any) {
      console.error("Checklist analysis error:", error);
      return {
        recommendedStatus: "na",
        confidence: 0,
        summary: "AI analysis could not be completed",
        recommendation: "Manual review required because AI analysis failed",
        requiresHumanReview: true,
      };
    }
  },
});

export const updateInspectionResults = mutation({
  args: {
    inspectionId: v.id("inspections"),
    checklist: v.array(v.object({
      itemId: v.string(),
      item: v.string(),
      status: v.union(v.literal("pass"), v.literal("fail"), v.literal("na")),
      comment: v.optional(v.string()),
    })),
    overallCondition: v.union(v.literal("pass"), v.literal("fail")),
    comments: v.optional(v.string()),
    followUpActionRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
  },
  returns: v.id("inspections"),
  handler: async (ctx, args) => {
    const failedItems = args.checklist.filter(
      (item: { status: "pass" | "fail" | "na"; item: string }) => item.status === "fail"
    );
    const autoFollowUpNotes = failedItems.length > 0
      ? `Follow-up automatically required for failed item(s): ${failedItems.map((item: { item: string }) => item.item).join(", ")}.${args.comments ? ` ${args.comments}` : ""}`
      : args.followUpNotes;

    await ctx.db.patch(args.inspectionId, {
      checklist: args.checklist,
      overallCondition: args.overallCondition,
      comments: args.comments,
      followUpActionRequired: args.followUpActionRequired || failedItems.length > 0,
      followUpNotes: autoFollowUpNotes,
      updatedAt: Date.now(),
    });
    return args.inspectionId;
  },
});

// Get employees for a company (to assign inspections to)
export const getCompanyEmployees = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx: any, args: any) => {
    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();
    
    return employees.filter((e: any) => e.role === "employee").map((e: any) => ({
      _id: e._id,
      fullName: e.fullName,
      email: e.email,
      role: e.role,
    }));
  },
});

// Create inspection assignment for employee(s)
export const assignInspectionToEmployee = mutation({
  args: {
    companyId: v.id("companies"),
    templateId: v.id("inspectionTemplates"),
    assignedToUserId: v.id("users"),
    dueDate: v.number(), // timestamp
    assetType: v.union(v.literal("vehicle"), v.literal("asset"), v.literal("general")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    assignedBy: v.id("users"),
  },
  returns: v.id("inspectionAssignments"),
  handler: async (ctx, args) => {
    const now = Date.now();
    return await ctx.db.insert("inspectionAssignments", {
      companyId: args.companyId,
      templateId: args.templateId,
      assignedToUserId: args.assignedToUserId,
      dueDate: args.dueDate,
      assetType: args.assetType,
      vehicleId: args.vehicleId,
      assetId: args.assetId,
      assignedBy: args.assignedBy,
      status: "pending",
      completedAt: undefined,
      completedBy: undefined,
      inspectionId: undefined,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get pending assignments for employee
export const getEmployeeAssignments = query({
  args: { 
    employeeId: v.id("users"),
    companyId: v.id("companies"),
  },
  handler: async (ctx: any, args: any) => {
    const assignments = await ctx.db
      .query("inspectionAssignments")
      .withIndex("by_employee_company", (q: any) => 
        q.eq("assignedToUserId", args.employeeId).eq("companyId", args.companyId)
      )
      .collect();
    
    return assignments.filter((a: any) => a.status === "pending");
  },
});

// Get all active assignments for company (manager view)
export const getCompanyActiveAssignments = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx: any, args: any) => {
    const assignments = await ctx.db
      .query("inspectionAssignments")
      .withIndex("by_company_status", (q: any) => 
        q.eq("companyId", args.companyId).eq("status", "pending")
      )
      .collect();
    
    return assignments;
  },
});

// Complete inspection assignment
export const completeAssignment = mutation({
  args: {
    assignmentId: v.id("inspectionAssignments"),
    inspectionId: v.id("inspections"),
    completedBy: v.id("users"),
  },
  returns: v.id("inspectionAssignments"),
  handler: async (ctx, args) => {
    await ctx.db.patch(args.assignmentId, {
      status: "completed",
      inspectionId: args.inspectionId,
      completedAt: Date.now(),
      completedBy: args.completedBy,
      updatedAt: Date.now(),
    });
    return args.assignmentId;
  },
});

// Get inspections by frequency type for employee
export const getInspectionsByFrequency = query({
  args: {
    employeeId: v.id("users"),
    companyId: v.id("companies"),
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("before_use")),
  },
  handler: async (ctx: any, args: any) => {
    const assignments = await ctx.db
      .query("equipmentAssignments")
      .withIndex("by_requirement", (q: any) =>
        q.eq("companyId", args.companyId).eq("inspectionFrequency", args.frequency)
      )
      .collect();

    return assignments.filter((a: any) => a.employeeId === args.employeeId && a.isActive);
  },
});

// Get previous inspections for an asset (for "before use" display)
export const getPreviousInspections = query({
  args: {
    assetType: v.union(v.literal("vehicle"), v.literal("asset")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: any) => {
    let queryBuilder = ctx.db.query("inspections").withIndex("by_asset", (q: any) => {
      const indexed = q.eq("assetType", args.assetType);
      if (args.vehicleId) {
        return indexed.eq("vehicleId", args.vehicleId);
      }
      if (args.assetId) {
        return indexed.eq("assetId", args.assetId);
      }
      return indexed;
    });

    const inspections = await queryBuilder.order("desc").collect();
    
    // Return last 5 inspections
    return inspections.slice(0, 5).map((i: any) => ({
      _id: i._id,
      dateTime: i.dateTime,
      overallCondition: i.overallCondition,
      isBaseline: i.isBaseline,
      checklist: i.checklist,
      comments: i.comments,
    }));
  },
});

// Assign inspection template to equipment with frequency
export const assignTemplateToEquipment = mutation({
  args: {
    companyId: v.id('companies'),
    employeeId: v.id('users'),
    templateId: v.id('inspectionTemplates'),
    inspectionFrequency: v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly'), v.literal('before_use')),
    assignedBy: v.id('users'),
    assetType: v.optional(v.union(v.literal('vehicle'), v.literal('asset'))),
    vehicleId: v.optional(v.id('vehicleProfiles')),
    assetId: v.optional(v.id('assetProfiles')),
    inspectionRequirement: v.optional(v.union(v.literal('daily'), v.literal('weekly'), v.literal('monthly'), v.literal('before_use'))),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const assignmentId = await ctx.db.insert('equipmentAssignments', {
      companyId: args.companyId,
      employeeId: args.employeeId,
      templateId: args.templateId,
      inspectionFrequency: args.inspectionFrequency,
      inspectionRequirement: args.inspectionRequirement || args.inspectionFrequency,
      requiresDailyInspection: (args.inspectionRequirement || args.inspectionFrequency) === 'daily',
      assetType: args.assetType || (args.vehicleId ? 'vehicle' : 'asset'),
      vehicleId: args.vehicleId,
      assetId: args.assetId,
      assignedBy: args.assignedBy,
      notes: args.notes,
      assignedDate: Date.now(),
      isActive: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return assignmentId;
  },
});

// Get pending inspections by frequency for employee
export const getPendingInspectionsByFrequency = query({
  args: {
    employeeId: v.id("users"),
    companyId: v.id("companies"),
    frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("before_use")),
  },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: any) => {
    const assignments = await ctx.db
      .query("equipmentAssignments")
      .withIndex("by_active", (q: any) =>
        q.eq("companyId", args.companyId).eq("isActive", true)
      )
      .collect();

    // Filter by employee, frequency, and active status
    const filtered = assignments.filter((a: any) => 
      a.employeeId === args.employeeId && 
      a.inspectionFrequency === args.frequency &&
      a.isActive
    );

    // Get template and asset details for each
    const result = [];
    for (const assignment of filtered) {
      const template = await ctx.db.get(assignment.templateId);
      let assetInfo = null;
      
      if (assignment.vehicleId) {
        assetInfo = await ctx.db.get(assignment.vehicleId);
      } else if (assignment.assetId) {
        assetInfo = await ctx.db.get(assignment.assetId);
      }

      result.push({
        _id: assignment._id,
        templateId: assignment.templateId,
        templateName: template?.name,
        assetType: assignment.assetType,
        vehicleId: assignment.vehicleId,
        assetId: assignment.assetId,
        assetName: assetInfo?.name || assetInfo?.registration || "Unknown Asset",
        frequency: assignment.inspectionFrequency,
        assignedDate: assignment.assignedDate,
        notes: assignment.notes,
      });
    }

    return result;
  },
});

// Get all active equipment assignments for company (manager view)
export const getCompanyEquipmentAssignments = query({
  args: { companyId: v.id("companies") },
  returns: v.array(v.any()),
  handler: async (ctx: any, args: any) => {
    const assignments = await ctx.db
      .query("equipmentAssignments")
      .withIndex("by_active", (q: any) =>
        q.eq("companyId", args.companyId).eq("isActive", true)
      )
      .collect();

    // Get full details for each assignment
    const result = [];
    for (const assignment of assignments) {
      const employee = await ctx.db.get(assignment.employeeId);
      const template = await ctx.db.get(assignment.templateId);
      let assetInfo = null;
      
      if (assignment.vehicleId) {
        assetInfo = await ctx.db.get(assignment.vehicleId);
      } else if (assignment.assetId) {
        assetInfo = await ctx.db.get(assignment.assetId);
      }

      result.push({
        _id: assignment._id,
        employeeName: employee?.fullName,
        employeeId: assignment.employeeId,
        templateName: template?.name,
        assetType: assignment.assetType,
        assetName: assetInfo?.name || assetInfo?.registration || "Unknown Asset",
        frequency: assignment.inspectionFrequency,
        assignedDate: assignment.assignedDate,
        createdAt: assignment.createdAt,
      });
    }

    return result;
  },
});