import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Subscription Packages
  packages: defineTable({
    name: v.string(),
    maxEmployees: v.number(),
    maxGroups: v.number(),
    priceMonthly: v.number(),
    features: v.array(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }),

  // Companies/Businesses
  companies: defineTable({
    name: v.string(),
    managerId: v.id("users"),
    packageId: v.optional(v.id("packages")),
    planRef: v.optional(v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise"))),
    scheduledPlanRef: v.optional(v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise"))),
    scheduledPlanEffectiveDate: v.optional(v.number()),
    subscriptionStatus: v.union(
      v.literal("active"),
      v.literal("trial"),
      v.literal("expired"),
      v.literal("cancelled")
    ),
    paymentDueDate: v.optional(v.number()),
    lastPaymentDate: v.optional(v.number()),
    trialEndsAt: v.optional(v.number()),
    employeeCount: v.number(),
    // Quiz defaults for managers
    quizQuestionCount: v.optional(v.number()),
    quizStyle: v.optional(v.union(
      v.literal("original"),
      v.literal("scenario"),
      v.literal("truefalse"),
      v.literal("quickcheck")
    )),
    // Feature toggles
    wellnessEnabled: v.optional(v.boolean()),
    conflictResolutionEnabled: v.optional(v.boolean()),
    // Business Hours (24-hour format)
    businessHours: v.optional(v.object({
      startHour: v.number(), // 0-23, default 8
      endHour: v.number(), // 0-23, default 16
      timezone: v.optional(v.string()), // e.g., "Africa/Johannesburg"
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_manager", ["managerId"])
    .index("by_status", ["subscriptionStatus"]),

  // Invite Codes for employees
  inviteCodes: defineTable({
    code: v.string(),
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    groupId: v.optional(v.id("employeeGroups")),
    usedBy: v.optional(v.id("users")),
    isUsed: v.boolean(),
    expiresAt: v.number(),
    createdAt: v.number(),
  }).index("by_code", ["code"])
    .index("by_company", ["companyId"]),

  // Employee Groups (for selective quizzes and policies)
  employeeGroups: defineTable({
    name: v.string(),
    companyId: v.id("companies"),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Users & Authentication
  users: defineTable({
    email: v.string(),
    password: v.string(),
    fullName: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("manager"),
      v.literal("employee"),
      v.literal("hr_manager"),
      v.literal("hr_officer"),
      v.literal("compliance_officer")
    ),
    companyId: v.optional(v.id("companies")),
    groupIds: v.optional(v.array(v.id("employeeGroups"))),
    pushToken: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_company", ["companyId"]),

  passwordResetTokens: defineTable({
    userId: v.id("users"),
    email: v.string(),
    codeHash: v.string(),
    expiresAt: v.number(),
    isUsed: v.boolean(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_email_and_code_hash", ["email", "codeHash"])
    .index("by_user", ["userId"]),

  // Policies (company-specific with group targeting)
  policies: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    fileType: v.union(v.literal("pdf"), v.literal("docx"), v.literal("txt")),
    fileUrl: v.string(),
    companyId: v.id("companies"),
    uploadedBy: v.id("users"),
    // Policy type: general (all employees) or group-specific
    policyType: v.union(v.literal("general"), v.literal("group")),
    // Target groups for group-specific policies
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    version: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_active", ["isActive"])
    .index("by_company", ["companyId"])
    .index("by_type", ["companyId", "policyType"]),

  // Policy Chunks for AI
  policyChunks: defineTable({
    policyId: v.id("policies"),
    chunkIndex: v.number(),
    content: v.string(),
    embeddings: v.optional(v.array(v.number())),
    createdAt: v.number(),
  }).index("by_policy", ["policyId"]),

  // Reading Scripts (generated before quiz)
  readingScripts: defineTable({
    title: v.string(),
    content: v.string(),
    companyId: v.id("companies"),
    // Script type: general or group-specific
    scriptType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    // Source policies used to generate this script
    sourcePolicyIds: v.array(v.id("policies")),
    // Date this script is for
    dateFor: v.string(), // "YYYY-MM-DD"
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_date", ["companyId", "dateFor"]),

  // Script Read Status
  scriptReadStatus: defineTable({
    userId: v.id("users"),
    scriptId: v.id("readingScripts"),
    readAt: v.number(),
    canTakeQuiz: v.boolean(),
  }).index("by_user_script", ["userId", "scriptId"])
    .index("by_user", ["userId"]),

  // Daily Quizzes (auto-generated)
  dailyQuizzes: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
    // Quiz type: general or group-specific
    quizType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    // Source policies/scripts
    sourcePolicyIds: v.array(v.id("policies")),
    scriptId: v.optional(v.id("readingScripts")),
    // Quiz config snapshot for this generated quiz
    questionCount: v.optional(v.number()),
    quizStyle: v.optional(v.union(
      v.literal("original"),
      v.literal("scenario"),
      v.literal("truefalse"),
      v.literal("quickcheck")
    )),
    // Date this quiz is for
    dateFor: v.string(), // "YYYY-MM-DD"
    isActive: v.boolean(),
    questionsReady: v.optional(v.boolean()), // true once questions are saved
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_date", ["companyId", "dateFor"]),

  // Daily Quiz Questions
  dailyQuizQuestions: defineTable({
    quizId: v.id("dailyQuizzes"),
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    explanation: v.optional(v.string()),
    policyRef: v.optional(v.string()),
    order: v.number(),
    // NEW: Difficulty and adaptive testing
    difficulty: v.optional(v.union(v.literal("easy"), v.literal("medium"), v.literal("hard"))),
    // NEW: Source content for validation
    sourceContent: v.optional(v.string()),
    // NEW: AI confidence score
    confidence: v.optional(v.number()),
    // NEW: HR validation workflow
    requiresValidation: v.optional(v.boolean()),
    validatedBy: v.optional(v.id("users")),
    validatedAt: v.optional(v.number()),
    approved: v.optional(v.boolean()),
    validationNotes: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_quiz", ["quizId"]),

  // Daily Quiz Attempts
  dailyQuizAttempts: defineTable({
    userId: v.id("users"),
    quizId: v.id("dailyQuizzes"),
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    attemptNumber: v.optional(v.number()), // 1, 2, 3, etc.
    passed: v.optional(v.boolean()), // score >= 70
    completedAt: v.number(),
  }).index("by_user_quiz", ["userId", "quizId"])
    .index("by_user", ["userId"]),

  // Question History - tracks previously asked questions to avoid repetition
  questionHistory: defineTable({
    companyId: v.id("companies"),
    policyTitle: v.string(),
    questionText: v.string(),
    category: v.string(), // understanding, application, reporting, responsibility, consequences
    dateAsked: v.string(), // "YYYY-MM-DD"
    createdAt: v.number(),
  }).index("by_company_and_date", ["companyId", "dateAsked"])
    .index("by_company_and_policy", ["companyId", "policyTitle"]),

  // Policy Cycle Tracker - rotates through policies, restarts when all covered
  policyCycleTracker: defineTable({
    companyId: v.id("companies"),
    policyId: v.id("policies"),
    lastUsedDate: v.string(), // "YYYY-MM-DD"
    cycleNumber: v.number(), // increments each full rotation
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_company_and_policy", ["companyId", "policyId"]),

  // Manager Notifications (for quiz failures, etc.)
  managerNotifications: defineTable({
    companyId: v.id("companies"),
    managerId: v.id("users"),
    type: v.string(), // "quiz_failure", etc.
    title: v.string(),
    message: v.string(),
    employeeId: v.id("users"),
    employeeName: v.string(),
    quizId: v.optional(v.id("dailyQuizzes")),
    dateFor: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_manager", ["managerId"])
    .index("by_company", ["companyId"]),

  // Employee quiz reminders and in-app fallbacks
  quizNotifications: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    role: v.union(v.literal("employee"), v.literal("manager")),
    type: v.union(
      v.literal("daily_reminder"),
      v.literal("risk_alert"),
      v.literal("weekly_summary"),
      v.literal("missed_quiz")
    ),
    title: v.string(),
    message: v.string(),
    dateFor: v.optional(v.string()),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_user_and_date", ["userId", "dateFor"])
    .index("by_company", ["companyId"]),

  // Legacy Quizzes (manual quizzes by manager)
  quizzes: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
    policyIds: v.array(v.id("policies")),
    createdBy: v.id("users"),
    quizType: v.union(v.literal("general"), v.literal("selective")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    schedule: v.optional(v.object({
      frequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("once")),
      dayOfWeek: v.optional(v.number()),
      hour: v.optional(v.number()),
    })),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Quiz Questions
  quizQuestions: defineTable({
    quizId: v.id("quizzes"),
    type: v.union(v.literal("mcq"), v.literal("truefalse"), v.literal("scenario")),
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.number(),
    explanation: v.optional(v.string()),
    policyRef: v.optional(v.string()),
    order: v.number(),
    createdAt: v.number(),
  }).index("by_quiz", ["quizId"]),

  // Quiz Responses
  quizResponses: defineTable({
    employeeId: v.id("users"),
    quizId: v.id("quizzes"),
    questionId: v.id("quizQuestions"),
    selectedAnswer: v.number(),
    isCorrect: v.boolean(),
    timeSpent: v.number(),
    completedAt: v.number(),
  }).index("by_employee_quiz", ["employeeId", "quizId"]),

  // Quiz Attempts
  quizAttempts: defineTable({
    employeeId: v.id("users"),
    quizId: v.id("quizzes"),
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    timeTaken: v.number(),
    attemptNumber: v.number(),
    completedAt: v.number(),
  }).index("by_employee_quiz", ["employeeId", "quizId"]),

  // Policy Acknowledgments
  policyAcknowledgments: defineTable({
    employeeId: v.id("users"),
    policyId: v.id("policies"),
    acknowledged: v.boolean(),
    acknowledgedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    requiresRetake: v.boolean(),
  }).index("by_employee_policy", ["employeeId", "policyId"])
    .index("by_employee", ["employeeId"]),

  // Direct Messages (Employee <-> Admin)
  directMessages: defineTable({
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
    companyId: v.id("companies"),
    message: v.string(),
    isRead: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_conversation", ["companyId", "fromUserId", "toUserId"])
    .index("by_to_user", ["toUserId"]),

  // Compliance Reports
  complianceReports: defineTable({
    employeeId: v.id("users"),
    generatedAt: v.number(),
    generatedBy: v.id("users"),
    policies: v.array(v.object({
      policyId: v.id("policies"),
      acknowledged: v.boolean(),
      lastAcknowledgedAt: v.optional(v.number()),
    })),
    quizScores: v.array(v.object({
      quizId: v.id("quizzes"),
      attempts: v.number(),
      bestScore: v.number(),
      latestScore: v.number(),
    })),
    overallCompliance: v.number(),
  }),

  // Legacy Chat Messages (keep for backwards compatibility)
  chatMessages: defineTable({
    userId: v.id("users"),
    message: v.string(),
    response: v.string(),
    sourcePolicies: v.array(v.id("policies")),
    createdAt: v.number(),
  }).index("by_user", ["userId"]),

  // Content Moderation tables
  contentFlags: defineTable({
    companyId: v.id("companies"),
    contentType: v.union(v.literal("policy"), v.literal("chat"), v.literal("user_content")),
    contentId: v.string(),
    reason: v.string(),
    severity: v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical")),
    violationType: v.string(),
    status: v.union(v.literal("pending"), v.literal("resolved"), v.literal("dismissed")),
    flaggedAt: v.number(),
    resolvedAt: v.optional(v.number()),
  }).index("by_company", ["companyId"])
    .index("by_status", ["status"]),

  moderationLog: defineTable({
    companyId: v.id("companies"),
    action: v.string(),
    reason: v.string(),
    timestamp: v.number(),
  }).index("by_company", ["companyId"]),

  // Professional Support (counselors, psychologists, lawyers)
  professionals: defineTable({
    companyId: v.id("companies"),
    type: v.union(v.literal("counselor"), v.literal("psychologist"), v.literal("lawyer")),
    name: v.string(),
    phone: v.string(),
    email: v.string(),
    specialty: v.optional(v.string()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_type", ["companyId", "type"]),

  // Conflict Resolution System
  conflictCases: defineTable({
    caseNumber: v.string(), // Unique case identifier
    title: v.string(),
    description: v.string(),
    companyId: v.id("companies"),
    createdBy: v.id("users"),
    status: v.union(
      v.literal("pending_parties"), // Waiting for all parties to join
      v.literal("pending_statements"), // Waiting for statements
      v.literal("under_review"), // AI is reviewing
      v.literal("judged"), // AI has provided judgment
      v.literal("closed") // Case closed
    ),
    inviteCode: v.string(), // Code for parties to join
    createdAt: v.number(),
    judgedAt: v.optional(v.number()),
  })
    .index("by_company", ["companyId"])
    .index("by_case_number", ["caseNumber"])
    .index("by_invite_code", ["inviteCode"]),

  conflictParties: defineTable({
    caseId: v.id("conflictCases"),
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    role: v.union(v.literal("initiator"), v.literal("respondent"), v.literal("witness")),
    hasSubmittedStatement: v.boolean(),
    joinedAt: v.number(),
  })
    .index("by_case", ["caseId"])
    .index("by_user", ["userId"])
    .index("by_case_and_user", ["caseId", "userId"]),

  conflictStatements: defineTable({
    caseId: v.id("conflictCases"),
    partyId: v.id("conflictParties"),
    userId: v.id("users"),
    statement: v.string(), // Their side of the story
    submittedAt: v.number(),
    updatedAt: v.optional(v.number()),
  })
    .index("by_case", ["caseId"])
    .index("by_party", ["partyId"]),

  conflictWitnesses: defineTable({
    caseId: v.id("conflictCases"),
    partyId: v.id("conflictParties"), // Which party added this witness
    witnessName: v.string(),
    witnessContact: v.string(),
    witnessStatement: v.string(),
    addedAt: v.number(),
  })
    .index("by_case", ["caseId"])
    .index("by_party", ["partyId"]),

  conflictEvidence: defineTable({
    caseId: v.id("conflictCases"),
    partyId: v.id("conflictParties"), // Which party submitted this evidence
    evidenceType: v.union(
      v.literal("document"),
      v.literal("video"),
      v.literal("audio"),
      v.literal("image")
    ),
    fileName: v.string(),
    fileUrl: v.string(), // Storage URL
    storageId: v.optional(v.string()), // Convex storage ID
    description: v.string(),
    uploadedAt: v.number(),
  })
    .index("by_case", ["caseId"])
    .index("by_party", ["partyId"]),

  conflictJudgments: defineTable({
    caseId: v.id("conflictCases"),
    judgmentText: v.string(), // AI's detailed judgment
    summary: v.string(), // Short summary
    recommendations: v.array(v.string()), // List of recommendations
    findings: v.object({
      initiatorPoints: v.array(v.string()),
      respondentPoints: v.array(v.string()),
      neutralObservations: v.array(v.string()),
    }),
    audioUrl: v.optional(v.string()), // Text-to-speech URL if generated
    createdAt: v.number(),
  })
    .index("by_case", ["caseId"]),

  // User saved judgments/outcomes
  savedJudgments: defineTable({
    userId: v.id("users"),
    caseId: v.id("conflictCases"),
    judgmentId: v.id("conflictJudgments"),
    notes: v.optional(v.string()),
    savedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_case", ["caseId"])
    .index("by_user_and_case", ["userId", "caseId"]),

  // Support Messages (user -> admin inbox)
  supportMessages: defineTable({
    userId: v.id("users"),
    userName: v.string(),
    userEmail: v.string(),
    subject: v.string(),
    message: v.string(),
    metadata: v.optional(v.object({
      platform: v.optional(v.string()),
      appVersion: v.optional(v.string()),
      buildNumber: v.optional(v.string()),
      deviceModel: v.optional(v.string()),
      osVersion: v.optional(v.string()),
      route: v.optional(v.string()),
    })),
    status: v.union(v.literal("open"), v.literal("replied"), v.literal("closed")),
    adminReply: v.optional(v.string()),
    repliedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_status", ["status"])
    .index("by_user", ["userId"]),

  // Company-level branding (white-label per company)
  companyBranding: defineTable({
    companyId: v.id("companies"),
    logoUrl: v.optional(v.string()),
    primaryColor: v.string(),
    secondaryColor: v.string(),
    accentColor: v.string(),
    displayName: v.optional(v.string()), // Override company name display
    welcomeMessage: v.optional(v.string()), // Custom welcome on home screen
    brandStatement: v.optional(v.string()), // Tagline under logo
    supportEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // App monitoring and production diagnostics
  appEvents: defineTable({
    category: v.union(
      v.literal("error"),
      v.literal("update"),
      v.literal("performance"),
      v.literal("security"),
      v.literal("usage")
    ),
    level: v.union(v.literal("info"), v.literal("warning"), v.literal("error")),
    source: v.string(),
    message: v.string(),
    userId: v.optional(v.id("users")),
    companyId: v.optional(v.id("companies")),
    metadata: v.optional(v.object({
      platform: v.optional(v.string()),
      appVersion: v.optional(v.string()),
      buildNumber: v.optional(v.string()),
      deviceModel: v.optional(v.string()),
      osVersion: v.optional(v.string()),
      route: v.optional(v.string()),
      stack: v.optional(v.string()),
      updateAvailable: v.optional(v.boolean()),
    })),
    createdAt: v.number(),
  }).index("by_category", ["category"]),

  // WHITE LABEL CONFIGURATION
  // Reseller accounts (platform admins who manage multiple companies)
  resellers: defineTable({
    email: v.string(),
    password: v.string(),
    companyName: v.string(),
    contactName: v.string(),
    subscriptionPlan: v.union(v.literal("starter"), v.literal("professional"), v.literal("enterprise")),
    subscriptionStatus: v.union(v.literal("active"), v.literal("trial"), v.literal("expired"), v.literal("cancelled")),
    trialEndsAt: v.optional(v.number()),
    subscriptionStartDate: v.number(),
    nextBillingDate: v.optional(v.number()),
    maxCompanies: v.number(), // Limited by plan
    usedCompanies: v.number(), // Current count
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_email", ["email"])
    .index("by_status", ["subscriptionStatus"]),

  // Brand customization per reseller
  resellerBranding: defineTable({
    resellerId: v.id("resellers"),
    logoUrl: v.optional(v.string()), // Uploaded logo
    primaryColor: v.string(), // Hex color
    secondaryColor: v.string(), // Hex color
    accentColor: v.string(), // Hex color
    companyName: v.string(), // Display name
    brandStatement: v.optional(v.string()), // Tagline/mission
    supportEmail: v.optional(v.string()),
    supportPhone: v.optional(v.string()),
    websiteUrl: v.optional(v.string()),
    // Domain customization (white-label domain)
    customDomain: v.optional(v.string()), // e.g., "policies.mycompany.com"
    customDomainVerified: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_reseller", ["resellerId"]),

  // Sub-companies managed by a reseller
  resellerCompanies: defineTable({
    resellerId: v.id("resellers"),
    companyId: v.id("companies"),
    createdAt: v.number(),
  }).index("by_reseller", ["resellerId"])
    .index("by_company", ["companyId"]),

  // Usage tracking for billing
  usageMetrics: defineTable({
    resellerId: v.id("resellers"),
    month: v.string(), // "YYYY-MM"
    employeesCreated: v.number(),
    policiesUploaded: v.number(),
    quizzesCreated: v.number(),
    apiCallsUsed: v.number(),
    storageUsedMB: v.number(),
    createdAt: v.number(),
  }).index("by_reseller", ["resellerId"])
    .index("by_reseller_month", ["resellerId", "month"]),

  // Payment history for resellers
  resellerPayments: defineTable({
    resellerId: v.id("resellers"),
    amount: v.number(),
    currency: v.string(), // "USD", "EUR", etc
    paymentMethod: v.string(), // "stripe", "bank_transfer"
    transactionId: v.string(), // External payment provider ID
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed"), v.literal("refunded")),
    invoiceUrl: v.optional(v.string()),
    billingPeriodStart: v.number(),
    billingPeriodEnd: v.number(),
    createdAt: v.number(),
  }).index("by_reseller", ["resellerId"])
    .index("by_status", ["status"]),

  // API Keys for resellers (for REST API access if needed)
  resellerApiKeys: defineTable({
    resellerId: v.id("resellers"),
    keyHash: v.string(), // Hash of the actual key (never store plain)
    name: v.string(),
    isActive: v.boolean(),
    lastUsedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_reseller", ["resellerId"]),

  // EFT Manual Payments (for manual bank transfers with proof)
  eftPayments: defineTable({
    companyId: v.id("companies"),
    userId: v.id("users"),
    packagePlan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    amount: v.number(),
    currency: v.string(), // "ZAR", "USD", etc
    paymentReference: v.string(), // Unique reference for tracking
    status: v.union(v.literal("pending"), v.literal("verified"), v.literal("failed"), v.literal("expired")),
    proofOfPaymentUrl: v.optional(v.string()), // Storage URL for proof image
    proofUploadedAt: v.optional(v.number()),
    verifiedAt: v.optional(v.number()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    expiresAt: v.number(), // Payment reference expires after 7 days
  }).index("by_company", ["companyId"])
    .index("by_user", ["userId"])
    .index("by_reference", ["paymentReference"])
    .index("by_status", ["status"]),

  // Package upgrade/downgrade history
  packageHistory: defineTable({
    companyId: v.id("companies"),
    managerId: v.id("users"),
    previousPlan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    newPlan: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    reason: v.optional(v.string()),
    effectiveDate: v.number(),
    createdAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_date", ["companyId", "effectiveDate"]),

  // Notifications for package changes and upgrades
  packageNotifications: defineTable({
    companyId: v.id("companies"),
    managerId: v.id("users"),
    type: v.union(
      v.literal("upgrade"),
      v.literal("downgrade"),
      v.literal("upgrade_available"),
      v.literal("feature_enabled"),
      v.literal("feature_disabled"),
      v.literal("version_update")
    ),
    title: v.string(),
    message: v.string(),
    icon: v.optional(v.string()),
    actionUrl: v.optional(v.string()),
    isRead: v.boolean(),
    isActionable: v.boolean(), // true if user should take action
    createdAt: v.number(),
  }).index("by_manager", ["managerId"])
    .index("by_company", ["companyId"])
    .index("by_type", ["companyId", "type"]),

  // App version tracking for OTA updates
  appVersions: defineTable({
    version: v.string(), // e.g., "1.0.0"
    platform: v.union(v.literal("ios"), v.literal("android"), v.literal("web")),
    releaseNotes: v.string(),
    isRequired: v.boolean(), // Force update if true
    downloadUrl: v.optional(v.string()),
    minVersionToUpgradeTo: v.optional(v.string()),
    releaseDate: v.number(),
    createdAt: v.number(),
  }).index("by_platform", ["platform"]),

  // INSPECTION MANAGEMENT SYSTEM

  // Inspection Templates (reusable inspection types)
  inspectionTemplates: defineTable({
    companyId: v.id("companies"),
    name: v.string(), // "Vehicle Inspection", "Equipment Inspection", etc.
    description: v.optional(v.string()),
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
    checklist: v.array(v.object({
      id: v.string(), // unique within template
      item: v.string(), // "Check Tire Pressure"
      required: v.boolean(),
      requiresComment: v.boolean(),
      requiresPhoto: v.boolean(),
    })),
    createdBy: v.id("users"),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // Vehicle Profiles (for vehicle inspections)
  vehicleProfiles: defineTable({
    companyId: v.id("companies"),
    registration: v.string(), // License plate
    fleetNumber: v.optional(v.string()),
    vehicleType: v.string(), // "Car", "Truck", "Van", etc.
    make: v.string(),
    model: v.string(),
    year: v.number(),
    driverId: v.optional(v.id("users")),
    department: v.optional(v.string()),
    site: v.optional(v.string()),
    currentMileage: v.number(),
    lastServiceDate: v.optional(v.number()),
    nextServiceDue: v.optional(v.number()),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_registration", ["registration"]),

  // Asset Profiles (general equipment, tools, etc.)
  assetProfiles: defineTable({
    companyId: v.id("companies"),
    assetId: v.string(), // unique asset identifier
    name: v.string(), // "Ladder", "Drill", "Workbench", etc.
    category: v.string(), // "Equipment", "Tools", "PPE", etc.
    location: v.optional(v.string()),
    assignedTo: v.optional(v.id("users")),
    purchaseDate: v.optional(v.number()),
    warrantyExpiry: v.optional(v.number()),
    condition: v.union(v.literal("excellent"), v.literal("good"), v.literal("fair"), v.literal("poor")),
    notes: v.optional(v.string()),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_asset_id", ["assetId"]),

  // Inspections (individual inspection records)
  inspections: defineTable({
    companyId: v.id("companies"),
    templateId: v.id("inspectionTemplates"),
    inspectorId: v.id("users"),
    assetType: v.union(v.literal("vehicle"), v.literal("asset"), v.literal("general")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    location: v.optional(v.string()),
    dateTime: v.number(), // timestamp
    mileage: v.optional(v.number()), // for vehicles
    checklist: v.array(v.object({
      itemId: v.string(),
      item: v.string(),
      status: v.union(v.literal("pass"), v.literal("fail"), v.literal("na")), // Not Applicable
      comment: v.optional(v.string()),
    })),
    overallCondition: v.union(v.literal("pass"), v.literal("fail")),
    comments: v.optional(v.string()),
    isBaseline: v.boolean(), // first inspection of an asset
    followUpActionRequired: v.boolean(),
    followUpNotes: v.optional(v.string()),
    status: v.union(v.literal("draft"), v.literal("submitted"), v.literal("approved"), v.literal("pending_review")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_inspector", ["inspectorId"])
    .index("by_asset", ["assetType", "vehicleId", "assetId"])
    .index("by_date", ["companyId", "dateTime"]),

  // Inspection Photos
  inspectionPhotos: defineTable({
    inspectionId: v.id("inspections"),
    companyId: v.id("companies"),
    templateId: v.id("inspectionTemplates"),
    checklistItemId: v.string(),
    itemName: v.string(),
    assetType: v.union(v.literal("vehicle"), v.literal("asset"), v.literal("general")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    isBaseline: v.boolean(),
    storageId: v.string(), // Convex storage ID
    photoUrl: v.string(), // Public URL
    caption: v.optional(v.string()),
    comment: v.optional(v.string()),
    angle: v.optional(v.string()), // "front", "side", "top", "bottom", "detail", etc.
    order: v.number(),
    uploadedAt: v.number(),
  })
    .index("by_inspection", ["inspectionId"])
    .index("by_inspection_item", ["inspectionId", "checklistItemId"])
    .index("by_company_template_item", ["companyId", "templateId", "checklistItemId"])
    .index("by_company_template", ["companyId", "templateId"]),

  // Baseline Comparisons (AI-powered photo comparisons)
  baselineComparisons: defineTable({
    companyId: v.id("companies"),
    assetProfileId: v.id("assetProfiles"),
    baselineInspectionId: v.id("inspections"),
    currentInspectionId: v.id("inspections"),
    analysisStatus: v.union(v.literal("pending"), v.literal("analyzing"), v.literal("completed"), v.literal("failed")),
    baselinePhotoId: v.id("inspectionPhotos"),
    currentPhotoId: v.id("inspectionPhotos"),
    aiAnalysis: v.optional(v.object({
      possibleDamage: v.array(v.string()), // List of potential damage areas
      visibleChanges: v.array(v.string()), // Changes detected
      missingComponents: v.array(v.string()), // Components that appear missing
      conditionAssessment: v.string(), // "Unchanged", "Minor Changes", "Significant Changes", etc.
      humanReviewRequired: v.boolean(),
      confidence: v.number(), // 0-100 confidence score
      recommendations: v.array(v.string()),
    })),
    humanVerification: v.optional(v.object({
      verifiedBy: v.id("users"),
      verifiedAt: v.number(),
      verified: v.boolean(),
      notes: v.optional(v.string()),
    })),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_asset", ["assetProfileId"]),

  // EQUIPMENT ASSIGNMENTS - Daily inspection assignments
  equipmentAssignments: defineTable({
    companyId: v.id("companies"),
    employeeId: v.id("users"),
    assetType: v.union(v.literal("vehicle"), v.literal("asset")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    templateId: v.id("inspectionTemplates"), // Which inspection template to use
    inspectionRequirement: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("before_use")),
    requiresDailyInspection: v.boolean(), // Shorthand: true if requirement is "daily"
    inspectionFrequency: v.union(v.literal("daily"), v.literal("weekly"), v.literal("monthly"), v.literal("before_use")),
    assignedDate: v.number(),
    unassignedDate: v.optional(v.number()),
    isActive: v.boolean(),
    assignedBy: v.id("users"),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_company", ["companyId"])
    .index("by_employee", ["employeeId"])
    .index("by_asset", ["assetType", "vehicleId", "assetId"])
    .index("by_active", ["companyId", "isActive"])
    .index("by_requirement", ["companyId", "inspectionRequirement"]),

  // Daily inspection tracking
  dailyInspectionChecks: defineTable({
    companyId: v.id("companies"),
    assignmentId: v.id("equipmentAssignments"),
    employeeId: v.id("users"),
    assetType: v.union(v.literal("vehicle"), v.literal("asset")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    date: v.string(), // "YYYY-MM-DD"
    inspectionId: v.optional(v.id("inspections")),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("overdue"), v.literal("skipped")),
    dueTime: v.optional(v.number()), // timestamp of when inspection was due
    completedAt: v.optional(v.number()),
    skippedReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_date", ["date"])
    .index("by_employee_date", ["employeeId", "date"])
    .index("by_company_date", ["companyId", "date"])
    .index("by_status", ["companyId", "status"]),

  paymentProofs: defineTable({
    companyId: v.id("companies"),
    managerId: v.id("users"),
    previousPlan: v.string(),
    newPlan: v.string(),
    proofUrl: v.string(),
    status: v.union(
      v.literal("pending_verification"),
      v.literal("verified"),
      v.literal("rejected")
    ),
    reason: v.optional(v.string()),
    adminNotes: v.optional(v.string()),
    createdAt: v.number(),
    verifiedAt: v.optional(v.number()),
    verifiedBy: v.optional(v.string()),
  }).index("by_status", ["status"]).index("by_company", ["companyId"]),

  // ─── HR AND ORGANISATION MANAGEMENT ───────────────────────────────────

  // Departments per company
  departments: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    headId: v.optional(v.id("users")), // Department manager
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_active", ["companyId", "isActive"]),

  // Sites/Locations per company
  sites: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    address: v.optional(v.string()),
    city: v.optional(v.string()),
    country: v.optional(v.string()),
    description: v.optional(v.string()),
    managerId: v.optional(v.id("users")),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_active", ["companyId", "isActive"]),

  // Extended employee profiles (links to user)
  employeeProfiles: defineTable({
    userId: v.id("users"),
    companyId: v.id("companies"),
    departmentId: v.optional(v.id("departments")),
    siteId: v.optional(v.id("sites")),
    jobPosition: v.optional(v.string()),
    managerId: v.optional(v.id("users")), // Direct manager
    startDate: v.optional(v.number()), // Timestamp
    employmentType: v.optional(v.union(
      v.literal("full_time"),
      v.literal("part_time"),
      v.literal("contract"),
      v.literal("temporary")
    )),
    status: v.union(
      v.literal("active"),
      v.literal("inactive"),
      v.literal("on_leave"),
      v.literal("suspended")
    ),
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_department", ["departmentId"])
    .index("by_site", ["siteId"])
    .index("by_manager", ["managerId"])
    .index("by_status", ["companyId", "status"]),

  // POLICY VERSIONING AND MANAGEMENT ─────────────────────────────────

  // Policy Version History
  policyVersions: defineTable({
    policyId: v.id("policies"),
    versionNumber: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    content: v.string(),
    fileUrl: v.string(),
    uploadedBy: v.id("users"),
    status: v.union(
      v.literal("draft"),
      v.literal("active"),
      v.literal("under_review"),
      v.literal("archived")
    ),
    effectiveDate: v.optional(v.number()),
    reviewDate: v.optional(v.number()),
    requiresTraining: v.boolean(),
    requiresAcknowledgement: v.boolean(),
    createdAt: v.number(),
  }).index("by_policy", ["policyId"])
    .index("by_status", ["status"]),

  // Policy Assignments (to departments, sites, employees)
  policyAssignments: defineTable({
    policyId: v.id("policies"),
    companyId: v.id("companies"),
    assignmentType: v.union(
      v.literal("department"),
      v.literal("site"),
      v.literal("employee")
    ),
    targetId: v.union(
      v.id("departments"),
      v.id("sites"),
      v.id("users")
    ),
    requiresTraining: v.optional(v.boolean()),
    trainingDeadline: v.optional(v.number()),
    createdBy: v.id("users"),
    createdAt: v.number(),
  }).index("by_policy", ["policyId"])
    .index("by_target", ["assignmentType", "targetId"])
    .index("by_company", ["companyId"]),

  // AI Question Source Traceability
  aiQuestionSources: defineTable({
    questionId: v.id("dailyQuizQuestions"),
    policyId: v.id("policies"),
    policyVersionId: v.id("policyVersions"),
    sourceCategory: v.string(), // "understanding", "application", etc.
    sourceContent: v.string(), // The specific content used to generate this question
    confidence: v.number(), // 0-100, how confident the AI is in this question
    validated: v.boolean(), // HR reviewed and validated
    createdAt: v.number(),
  }).index("by_question", ["questionId"])
    .index("by_policy", ["policyId"])
    .index("by_version", ["policyVersionId"]),

  // Role definitions per company (for RBAC - future)
  customRoles: defineTable({
    companyId: v.id("companies"),
    name: v.string(),
    description: v.optional(v.string()),
    permissions: v.array(v.string()), // Permission codes: "view_policies", "manage_employees", etc.
    isActive: v.boolean(),
    isSystem: v.boolean(), // true for built-in roles (admin, manager, employee, hr_manager, etc.)
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"])
    .index("by_system", ["isSystem"]),

  // User role assignments (for extensibility)
  userRoles: defineTable({
    userId: v.id("users"),
    companyId: v.id("companies"),
    customRoleId: v.id("customRoles"),
    assignedAt: v.number(),
    assignedBy: v.id("users"),
  }).index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_role", ["customRoleId"]),

  // Policy Training Configuration
  policyTrainingConfig: defineTable({
    companyId: v.id("companies"),
    policyId: v.id("policies"),
    requiresTraining: v.boolean(),
    requiresAcknowledgement: v.boolean(),
    passingScore: v.number(),
    questionsPerDay: v.number(),
    trainingSchedule: v.object({
      startDate: v.number(),
      duration: v.number(),
    }),
    createdAt: v.number(),
    createdBy: v.id("users"),
    updatedAt: v.number(),
    updatedBy: v.id("users"),
  }).index("by_policy", ["companyId", "policyId"]),

  // AI Question Reviews
  aiQuestionReviews: defineTable({
    companyId: v.id("companies"),
    questionId: v.id("dailyQuizzes"),
    reason: v.string(),
    status: v.union(v.literal("pending_review"), v.literal("approved"), v.literal("rejected")),
    createdAt: v.number(),
    createdBy: v.id("users"),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reviewNotes: v.optional(v.string()),
  }).index("by_company_status", ["companyId", "status"]),

  // AI TEST GENERATION IMPROVEMENTS ───────────────────────────────────────

  // Test Generation Configuration (HR controls)
  testGenerationConfig: defineTable({
    companyId: v.id("companies"),
    enabled: v.boolean(),
    questionsPerDay: v.number(),
    passingScore: v.number(),
    scheduledTime: v.optional(v.number()), // 0-23, hour of day
    trainingSchedule: v.optional(v.string()), // "daily", "weekday", "weekly"
    createdBy: v.id("users"),
    updatedBy: v.id("users"),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_company", ["companyId"]),

  // AI Generation Audit Log
  aiGenerationLog: defineTable({
    companyId: v.id("companies"),
    policyId: v.id("policies"),
    policyVersionId: v.optional(v.id("policyVersions")),
    quizId: v.id("dailyQuizzes"),
    questionsGenerated: v.number(),
    questionsSuccessful: v.number(),
    questionsFailed: v.number(),
    generationMethod: v.union(v.literal("llm"), v.literal("fallback")),
    averageConfidence: v.number(),
    notes: v.optional(v.string()),
    generatedAt: v.number(),
  }).index("by_company_date", ["companyId", "generatedAt"]),

  // PERSONAL LEARNING SYSTEM ────────────────────────────────────────────
  // Employee personal learning requests
  learningRequests: defineTable({
    userId: v.id("users"),
    companyId: v.id("companies"),
    skill: v.string(), // Skill/topic to learn
    reason: v.string(), // Why they want to learn this
    experienceLevel: v.union(
      v.literal("beginner"),
      v.literal("some_experience"),
      v.literal("intermediate"),
      v.literal("advanced")
    ),
    availableTime: v.union(
      v.literal("10_minutes"),
      v.literal("20_minutes"),
      v.literal("30_minutes"),
      v.literal("60_minutes")
    ),
    learningGoal: v.string(), // What they want to achieve
    status: v.union(
      v.literal("requested"),
      v.literal("generating"),
      v.literal("active"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_company", ["companyId"])
    .index("by_status", ["userId", "status"]),

  // Learning Modules (curriculum structure)
  learning_modules: defineTable({
    learningRequestId: v.id("learningRequests"),
    title: v.string(), // Module title
    description: v.optional(v.string()),
    order: v.number(), // 1, 2, 3, etc.
    estimatedDurationMinutes: v.number(),
    objectives: v.array(v.string()), // What students will learn
    difficultyLevel: v.union(v.literal("beginner"), v.literal("intermediate"), v.literal("advanced")),
    createdAt: v.number(),
  }).index("by_learning_request", ["learningRequestId"]),

  // Learning Lessons (individual lessons within modules)
  learning_lessons: defineTable({
    moduleId: v.id("learning_modules"),
    learningRequestId: v.id("learningRequests"),
    title: v.string(), // Lesson title
    description: v.optional(v.string()),
    content: v.optional(v.string()), // Content (can be generated later)
    order: v.number(), // 1, 2, 3, etc. within the module
    estimatedDurationMinutes: v.number(),
    keyPoints: v.array(v.string()), // Main takeaways
    createdAt: v.number(),
  }).index("by_module", ["moduleId"])
    .index("by_learning_request", ["learningRequestId"]),

  // Lesson Content (AI-generated educational material)
  lesson_content: defineTable({
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    title: v.string(),
    introduction: v.string(), // Context/hook for the lesson
    objectives: v.array(v.string()), // What learner will learn
    mainExplanation: v.string(), // Core teaching material
    examples: v.array(v.object({
      title: v.string(),
      description: v.string(),
    })),
    practicalApplication: v.string(), // How to apply this in real life
    keyPoints: v.array(v.string()), // Summary bullets
    knowledgeCheck: v.object({
      question: v.string(),
      options: v.array(v.string()),
      correctAnswer: v.number(),
      explanation: v.string(),
    }),
    generatedAt: v.number(),
  }).index("by_lesson", ["lessonId"])
    .index("by_learning_request", ["learningRequestId"]),

  // Lesson Progress (track user reading progress)
  lesson_progress: defineTable({
    userId: v.id("users"),
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    startedAt: v.number(),
    completedAt: v.optional(v.number()),
    isCompleted: v.boolean(),
    currentSection: v.union(
      v.literal("introduction"),
      v.literal("objectives"),
      v.literal("explanation"),
      v.literal("examples"),
      v.literal("application"),
      v.literal("keypoints"),
      v.literal("knowledge_check"),
      v.literal("completed")
    ),
    knowledgeCheckAnswered: v.optional(v.boolean()),
    knowledgeCheckCorrect: v.optional(v.boolean()),
    timeSpentMinutes: v.number(), // Updated as user reads
    lastAccessedAt: v.number(),
  }).index("by_user_lesson", ["userId", "lessonId"])
    .index("by_user_request", ["userId", "learningRequestId"])
    .index("by_learning_request", ["learningRequestId"]),

  learning_daily_schedule: defineTable({
    learningRequestId: v.id("learningRequests"),
    dayNumber: v.number(),
    lessonId: v.id("learning_lessons"),
    moduleId: v.id("learning_modules"),
    estimatedMinutes: v.number(),
    order: v.number(),
    createdAt: v.number(),
  })
    .index("by_learning_request", ["learningRequestId"])
    .index("by_day", ["learningRequestId", "dayNumber"]),

  learning_daily_progress: defineTable({
    userId: v.id("users"),
    learningRequestId: v.id("learningRequests"),
    dayNumber: v.number(),
    status: v.union(
      v.literal("not_started"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("missed")
    ),
    lessonId: v.id("learning_lessons"),
    startedAt: v.optional(v.number()),
    completedAt: v.optional(v.number()),
    score: v.optional(v.number()),
  })
    .index("by_user_learning", ["userId", "learningRequestId"])
    .index("by_day", ["userId", "learningRequestId", "dayNumber"]),

  // PERSONAL LEARNING QUIZZES (separate from company policy testing)
  learning_quizzes: defineTable({
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    dayNumber: v.number(),
    title: v.string(),
    description: v.optional(v.string()),
    questionsCount: v.number(),
    generatedAt: v.number(),
  })
    .index("by_lesson", ["lessonId"])
    .index("by_learning_request", ["learningRequestId"])
    .index("by_day", ["learningRequestId", "dayNumber"]),

  // Personal Learning Quiz Questions (auto-generated from lesson content)
  learning_quiz_questions: defineTable({
    quizId: v.id("learning_quizzes"),
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    questionType: v.union(
      v.literal("multiple_choice"),
      v.literal("true_false"),
      v.literal("multiple_answer"),
      v.literal("scenario")
    ),
    question: v.string(),
    options: v.array(v.string()),
    correctAnswer: v.union(v.number(), v.array(v.number())), // index or indices
    explanation: v.string(), // Educational feedback
    sourceContent: v.string(), // The lesson content this question came from
    order: v.number(),
    difficulty: v.union(v.literal("easy"), v.literal("medium"), v.literal("hard")),
    createdAt: v.number(),
  })
    .index("by_quiz", ["quizId"])
    .index("by_lesson", ["lessonId"]),

  // Personal Learning Quiz Attempts
  learning_quiz_attempts: defineTable({
    userId: v.id("users"),
    quizId: v.id("learning_quizzes"),
    lessonId: v.id("learning_lessons"),
    learningRequestId: v.id("learningRequests"),
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    completedAt: v.number(),
  })
    .index("by_user_quiz", ["userId", "quizId"])
    .index("by_user_lesson", ["userId", "lessonId"])
    .index("by_learning_request", ["userId", "learningRequestId"]),

  // Personal Learning Question History (avoid repetition)
  learning_question_history: defineTable({
    learningRequestId: v.id("learningRequests"),
    lessonId: v.id("learning_lessons"),
    questionText: v.string(),
    category: v.string(),
    dateAsked: v.string(), // "YYYY-MM-DD"
    createdAt: v.number(),
  })
    .index("by_learning_request", ["learningRequestId"])
    .index("by_lesson", ["lessonId"])
    .index("by_date", ["learningRequestId", "dateAsked"]),

  // ─── TERMS AND CONDITIONS ───────────────────────────────────
  // Version-controlled terms and conditions
  termsAndConditions: defineTable({
    type: v.union(
      v.literal("terms"),
      v.literal("privacy"),
      v.literal("acceptable_use"),
      v.literal("data_protection")
    ),
    version: v.number(), // v1, v2, v3, etc.
    title: v.string(),
    content: v.string(), // Full T&C text (markdown format)
    summary: v.optional(v.string()), // Short summary for display
    effectiveDate: v.number(), // When this version becomes effective
    isActive: v.boolean(), // Currently in use
    createdBy: v.id("users"), // Admin who created this
    createdAt: v.number(),
  })
    .index("by_type_active", ["type", "isActive"])
    .index("by_type_version", ["type", "version"]),

  // User acknowledgments of T&C
  termsAcknowledgments: defineTable({
    userId: v.id("users"),
    termsId: v.id("termsAndConditions"),
    versionAccepted: v.number(),
    ipAddress: v.optional(v.string()),
    deviceInfo: v.optional(v.string()),
    acknowledgedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_terms", ["termsId"])
    .index("by_user_and_terms", ["userId", "termsId"]),

  // User Presence Tracking
  userPresence: defineTable({
    userId: v.id("users"),
    lastSeen: v.number(), // timestamp
    isOnline: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_online", ["isOnline"]),

  // Inspection Assignments (assign inspections to employees)
  inspectionAssignments: defineTable({
    companyId: v.id("companies"),
    templateId: v.id("inspectionTemplates"),
    assignedToUserId: v.id("users"),
    dueDate: v.number(), // timestamp
    assetType: v.union(v.literal("vehicle"), v.literal("asset"), v.literal("general")),
    vehicleId: v.optional(v.id("vehicleProfiles")),
    assetId: v.optional(v.id("assetProfiles")),
    assignedBy: v.id("users"),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("overdue")),
    completedAt: v.optional(v.number()),
    completedBy: v.optional(v.id("users")),
    inspectionId: v.optional(v.id("inspections")),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_employee_company", ["assignedToUserId", "companyId"])
    .index("by_company_status", ["companyId", "status"])
    .index("by_template", ["templateId"])
    .index("by_due_date", ["dueDate"]),
});