import { v } from "convex/values";
import { query } from "./_generated/server";

// ─────────────────────────────────────────────────────────────
// HR COMPLIANCE DASHBOARD - REAL DATA QUERIES
// ─────────────────────────────────────────────────────────────

/**
 * GET OVERALL COMPLIANCE METRICS
 * Calculates real compliance statistics from database
 */
export const getComplianceDashboardMetrics = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, { companyId }) => {
    // Get all employees in company
    const employees = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .collect();

    const employeeCount = employees.length;
    if (employeeCount === 0) {
      return {
        complianceSummary: {
          overallCompliance: 0,
          policyAcknowledgementRate: 0,
          testCompletionRate: 0,
          testPassRate: 0,
          averageScore: 0,
          totalEmployees: 0,
          failedTests: 0,
          overdueTests: 0,
          employeesRequiringAttention: 0,
        },
        trainingInsights: [],
        riskAreas: [],
      };
    }

    // Get all policies for company
    const policies = await ctx.db
      .query("policies")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .collect();

    // Get policy acknowledgements
    const acknowledgements = await ctx.db
      .query("policyAcknowledgments")
      .collect();

    const companyAcknowledgements = acknowledgements.filter((a) =>
      policies.some((p) => p._id === a.policyId)
    );

    // Calculate acknowledgement rate
    const totalPoliciesForEmployees = policies.length * employeeCount;
    const acknowledgementRate =
      totalPoliciesForEmployees > 0
        ? Math.round((companyAcknowledgements.length / totalPoliciesForEmployees) * 100)
        : 0;

    // Get all daily quizzes for company
    const quizzes = await ctx.db
      .query("dailyQuizzes")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .collect();

    // Get quiz attempts
    const quizAttempts = await ctx.db
      .query("dailyQuizAttempts")
      .collect();

    const companyQuizAttempts = quizAttempts.filter((qa) =>
      quizzes.some((q) => q._id === qa.quizId)
    );

    // Calculate test metrics
    const testCompletionRate =
      quizzes.length > 0
        ? Math.round((companyQuizAttempts.length / quizzes.length) * 100)
        : 0;

    const passedTests = companyQuizAttempts.filter(
      (qa) => qa.percentCorrect >= 70
    ).length;
    const testPassRate =
      companyQuizAttempts.length > 0
        ? Math.round((passedTests / companyQuizAttempts.length) * 100)
        : 0;

    const totalScore = companyQuizAttempts.reduce(
      (sum, qa) => sum + (qa.percentCorrect || 0),
      0
    );
    const averageScore =
      companyQuizAttempts.length > 0
        ? Math.round(totalScore / companyQuizAttempts.length)
        : 0;

    const failedTests = companyQuizAttempts.filter(
      (qa) => qa.percentCorrect < 70
    ).length;

    // Calculate overdue (older than 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const overdueTests = quizzes.filter(
      (q) => q.createdAt < sevenDaysAgo && !companyQuizAttempts.find((qa) => qa.quizId === q._id)
    ).length;

    // Employees requiring attention (low scores)
    const lowPerformers = new Set();
    companyQuizAttempts.forEach((qa) => {
      if (qa.percentCorrect < 60) {
        lowPerformers.add(qa.userId);
      }
    });

    // Calculate overall compliance (weighted)
    const overallCompliance = Math.round(
      (acknowledgementRate * 0.4 + testCompletionRate * 0.3 + testPassRate * 0.3) / 100
    );

    // Get training insights
    const trainingInsights = await getTrainingInsights(ctx, companyId, companyQuizAttempts);

    return {
      complianceSummary: {
        overallCompliance,
        policyAcknowledgementRate: acknowledgementRate,
        testCompletionRate,
        testPassRate,
        averageScore,
        totalEmployees: employeeCount,
        failedTests,
        overdueTests,
        employeesRequiringAttention: lowPerformers.size,
      },
      trainingInsights,
      generatedAt: new Date().toISOString(),
    };
  },
});

/**
 * TRAINING INSIGHTS - Detected gaps from AI testing
 */
async function getTrainingInsights(ctx: any, companyId: string, quizAttempts: any[]) {
  const insights: string[] = [];

  // Find employees failing recent tests
  const failedRecently = quizAttempts
    .filter(
      (qa) =>
        qa.percentCorrect < 70 &&
        qa.submittedAt > Date.now() - 3 * 24 * 60 * 60 * 1000
    )
    .map((qa) => qa.userId);
  const uniqueFailed = new Set(failedRecently);

  if (uniqueFailed.size > 0) {
    insights.push(`${uniqueFailed.size} employees have failed recent tests.`);
  }

  // Find outstanding daily tests
  const quizzes = await ctx.db
    .query("dailyQuizzes")
    .filter((q) => q.eq(q.field("companyId"), companyId))
    .collect();

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const outstanding = quizzes.filter(
    (q) =>
      q.createdAt > sevenDaysAgo &&
      !quizAttempts.find((qa) => qa.quizId === q._id)
  );

  if (outstanding.length > 0) {
    insights.push(`${outstanding.length} employees have outstanding daily tests.`);
  }

  // Find low average performers
  const performerScores = new Map();
  quizAttempts.forEach((qa) => {
    const scores = performerScores.get(qa.userId) || [];
    scores.push(qa.percentCorrect);
    performerScores.set(qa.userId, scores);
  });

  const lowPerformers = Array.from(performerScores.entries()).filter(
    ([_, scores]) => scores.reduce((a, b) => a + b, 0) / scores.length < 60
  ).length;

  if (lowPerformers > 0) {
    insights.push(`${lowPerformers} employees have low average scores and need additional training.`);
  }

  // Policy acknowledgement gaps
  const policies = await ctx.db
    .query("policies")
    .filter((q) => q.eq(q.field("companyId"), companyId))
    .collect();

  const unacknowledged = policies.filter((p) => !p.acknowledgedCount || p.acknowledgedCount === 0);
  if (unacknowledged.length > 0) {
    insights.push(`${unacknowledged.length} policies have low acknowledgement rates.`);
  }

  return insights;
}

/**
 * GET EMPLOYEE COMPLIANCE PROFILE
 */
export const getEmployeeComplianceProfile = query({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
  },
  handler: async (ctx, { companyId, userId }) => {
    const user = await ctx.db.get(userId);
    if (!user || user.companyId !== companyId) {
      throw new Error("User not found or unauthorized");
    }

    // Get policies
    const policies = await ctx.db
      .query("policies")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .collect();

    // Get acknowledgements for this user
    const acknowledgements = await ctx.db
      .query("policyAcknowledgments")
      .collect();

    const userAckowledgements = acknowledgements.filter(
      (a) => a.userId === userId
    );

    const acknowledgedPolicies = new Set(
      userAckowledgements.map((a) => a.policyId)
    );

    // Get quiz attempts for this user
    const quizzes = await ctx.db
      .query("dailyQuizzes")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .collect();

    const quizAttempts = await ctx.db
      .query("dailyQuizAttempts")
      .collect();

    const userAttempts = quizAttempts.filter((qa) => qa.userId === userId);

    // Calculate metrics
    const policiesAcknowledged = acknowledgedPolicies.size;
    const policiesOutstanding = policies.length - policiesAcknowledged;
    const dailyTestsCompleted = userAttempts.length;
    const dailyTestsMissed = quizzes.filter(
      (q) => !userAttempts.find((qa) => qa.quizId === q._id)
    ).length;

    const totalScore = userAttempts.reduce(
      (sum, qa) => sum + (qa.percentCorrect || 0),
      0
    );
    const averageScore =
      userAttempts.length > 0 ? Math.round(totalScore / userAttempts.length) : 0;

    const failedTests = userAttempts.filter((qa) => qa.percentCorrect < 70).length;
    const passRate =
      userAttempts.length > 0
        ? Math.round(((userAttempts.length - failedTests) / userAttempts.length) * 100)
        : 0;

    // Identify weak topics
    const weakTopics = await identifyWeakTopics(userAttempts);

    // Recent performance (last 7 days)
    const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentAttempts = userAttempts.filter(
      (qa) => qa.submittedAt > sevenDaysAgo
    );
    const recentPassRate =
      recentAttempts.length > 0
        ? Math.round(
            (recentAttempts.filter((qa) => qa.percentCorrect >= 70).length /
              recentAttempts.length) *
              100
          )
        : 0;

    return {
      employee: {
        id: user._id,
        name: user.fullName || user.email,
        email: user.email,
      },
      compliance: {
        policiesAcknowledged,
        policiesOutstanding,
        dailyTestsCompleted,
        dailyTestsMissed,
        averageScore,
        failedTests,
        passRate,
        weakTopics,
        recentPerformance: {
          recentTestsCompleted: recentAttempts.length,
          recentPassRate,
          trend: calculateTrend(recentAttempts),
        },
        trainingStatus: getTrainingStatus(
          policiesOutstanding,
          failedTests,
          averageScore
        ),
      },
    };
  },
});

/**
 * GET DEPARTMENT COMPLIANCE
 */
export const getDepartmentCompliance = query({
  args: {
    companyId: v.id("companies"),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, { companyId, departmentId }) => {
    // Get employees in department
    let employees = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .collect();

    if (departmentId) {
      const employeeProfiles = await ctx.db
        .query("employeeProfiles")
        .collect();

      const deptEmployeeIds = new Set(
        employeeProfiles
          .filter((ep) => ep.departmentId === departmentId)
          .map((ep) => ep.userId)
      );

      employees = employees.filter((e) => deptEmployeeIds.has(e._id));
    }

    if (employees.length === 0) {
      return {
        department: departmentId ? { id: departmentId } : { id: null, name: "All" },
        metrics: {
          totalEmployees: 0,
          averageCompliance: 0,
          averageScore: 0,
          failureRate: 0,
          requiresAttention: false,
        },
        employeesList: [],
      };
    }

    // Get quiz attempts for department
    const quizzes = await ctx.db
      .query("dailyQuizzes")
      .filter((q) => q.eq(q.field("companyId"), companyId))
      .collect();

    const quizAttempts = await ctx.db
      .query("dailyQuizAttempts")
      .collect();

    const deptAttempts = quizAttempts.filter((qa) =>
      employees.some((e) => e._id === qa.userId)
    );

    // Calculate department metrics
    const averageScore =
      deptAttempts.length > 0
        ? Math.round(
            deptAttempts.reduce((sum, qa) => sum + (qa.percentCorrect || 0), 0) /
              deptAttempts.length
          )
        : 0;

    const failureRate =
      deptAttempts.length > 0
        ? Math.round(
            (deptAttempts.filter((qa) => qa.percentCorrect < 70).length /
              deptAttempts.length) *
              100
          )
        : 0;

    const averageCompliance = Math.round((100 - failureRate * 0.5) * 0.8); // Weighted

    // Employee details
    const employeesList = employees
      .map((emp) => {
        const empAttempts = deptAttempts.filter((qa) => qa.userId === emp._id);
        const empScore =
          empAttempts.length > 0
            ? Math.round(
                empAttempts.reduce((sum, qa) => sum + (qa.percentCorrect || 0), 0) /
                  empAttempts.length
              )
            : 0;
        return {
          id: emp._id,
          name: emp.fullName || emp.email,
          testCount: empAttempts.length,
          averageScore: empScore,
          requiresAttention: empScore < 70 || empAttempts.length === 0,
        };
      })
      .sort((a, b) => (a.requiresAttention ? -1 : 1));

    return {
      department: {
        id: departmentId,
        name: departmentId ? "Department" : "Company-wide",
      },
      metrics: {
        totalEmployees: employees.length,
        averageCompliance,
        averageScore,
        failureRate,
        requiresAttention: failureRate > 30 || averageScore < 70,
      },
      employeesList,
    };
  },
});

// HELPER FUNCTIONS

async function identifyWeakTopics(quizAttempts: any[]) {
  const topics: { [key: string]: number[] } = {};
  quizAttempts.forEach((qa) => {
    if (qa.category) {
      if (!topics[qa.category]) topics[qa.category] = [];
      topics[qa.category].push(qa.percentCorrect || 0);
    }
  });

  return Object.entries(topics)
    .map(([topic, scores]) => ({
      topic,
      averageScore: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      attempts: scores.length,
    }))
    .filter((t) => t.averageScore < 70)
    .sort((a, b) => a.averageScore - b.averageScore);
}

function calculateTrend(attempts: any[]): "improving" | "stable" | "declining" {
  if (attempts.length < 2) return "stable";
  const firstHalf = attempts.slice(0, Math.ceil(attempts.length / 2));
  const secondHalf = attempts.slice(Math.ceil(attempts.length / 2));
  const firstAvg =
    firstHalf.reduce((sum, a) => sum + (a.percentCorrect || 0), 0) / firstHalf.length;
  const secondAvg =
    secondHalf.reduce((sum, a) => sum + (a.percentCorrect || 0), 0) / secondHalf.length;

  if (secondAvg > firstAvg + 10) return "improving";
  if (secondAvg < firstAvg - 10) return "declining";
  return "stable";
}

function getTrainingStatus(
  policiesOutstanding: number,
  failedTests: number,
  averageScore: number
): "compliant" | "at-risk" | "needs-attention" {
  if (policiesOutstanding > 0 || failedTests > 2) return "needs-attention";
  if (averageScore < 70) return "at-risk";
  return "compliant";
}
