import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────────
// HR COMPLIANCE DASHBOARD - REAL DATA CALCULATIONS
// ─────────────────────────────────────────────────────────────

// OVERALL COMPLIANCE METRICS
export const getCompanyCompliance = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    // Get all employees
    const employees = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const activeEmployees = employees.filter((e) => e.role !== "admin");
    const totalEmployees = activeEmployees.length;

    if (totalEmployees === 0) {
      return {
        totalEmployees: 0,
        overallCompliance: 0,
        policyAckRate: 0,
        testCompletionRate: 0,
        testPassRate: 0,
        averageScore: 0,
        failedTests: 0,
        overdueTests: 0,
        employeesRequiringAttention: 0,
        trainingGaps: [],
      };
    }

    // Get all policies for company
    const policies = await ctx.db
      .query("policies")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const activePolicies = policies.filter((p) => p.status === "active");
    const totalActivePolicies = activePolicies.length;

    // Policy acknowledgements - calculate acknowledgement rate
    const acknowledgements = await ctx.db
      .query("policyAcknowledgments")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    // Count employees who have acknowledged at least one active policy
    const employeesWithAckn = new Set(
      acknowledgements
        .filter((a) => activePolicies.some((p) => p._id === a.policyId))
        .map((a) => a.userId)
    );

    const policyAckRate =
      totalEmployees > 0 ? (employeesWithAckn.size / totalEmployees) * 100 : 0;

    // Daily tests - get all test attempts
    const quizzes = await ctx.db
      .query("dailyQuizzes")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    // Get quiz attempts
    const attempts = await ctx.db
      .query("quizAttempts")
      .filter((q) =>
        q.and(
          q.eq(q.field("companyId"), args.companyId),
          q.gt(q.field("completedAt"), Date.now() - 30 * 24 * 60 * 60 * 1000) // Last 30 days
        )
      )
      .collect();

    // Employees who completed tests
    const employeesCompletedTests = new Set(attempts.map((a) => a.userId));
    const testCompletionRate =
      totalEmployees > 0
        ? (employeesCompletedTests.size / totalEmployees) * 100
        : 0;

    // Test pass rate and average score
    const passedAttempts = attempts.filter(
      (a) => a.score >= (a.passingScore || 70)
    );
    const testPassRate =
      attempts.length > 0 ? (passedAttempts.length / attempts.length) * 100 : 0;

    const averageScore =
      attempts.length > 0
        ? attempts.reduce((sum, a) => sum + a.score, 0) / attempts.length
        : 0;

    // Failed tests and overdue tests
    const failedTests = attempts.filter((a) => a.score < (a.passingScore || 70))
      .length;

    // Overdue - quizzes that should be completed but aren't
    const now = Date.now();
    const today = new Date(now).toISOString().split("T")[0];
    const todayQuizzes = quizzes.filter(
      (q) => q.date === today && q.companyId === args.companyId
    );
    const completedByEmployee = new Map<string, boolean>();
    attempts.forEach((a) => {
      completedByEmployee.set(a.userId, true);
    });

    let overdueTests = 0;
    activeEmployees.forEach((emp) => {
      if (!completedByEmployee.has(emp._id) && todayQuizzes.length > 0) {
        overdueTests++;
      }
    });

    // Employees requiring attention (failed tests or incomplete)
    const employeesWithIssues = new Set<string>();
    attempts
      .filter((a) => a.score < (a.passingScore || 70))
      .forEach((a) => {
        employeesWithIssues.add(a.userId);
      });

    activeEmployees.forEach((emp) => {
      if (!completedByEmployee.has(emp._id)) {
        employeesWithIssues.add(emp._id);
      }
    });

    // Training gaps - identify weak topics
    const trainingGaps: {
      topic: string;
      failureCount: number;
      employeeCount: number;
    }[] = [];
    const topicFailures = new Map<string, Set<string>>();

    attempts
      .filter((a) => a.score < (a.passingScore || 70))
      .forEach((attempt) => {
        // Extract topic from quiz if available
        const topic = attempt.topic || "General";
        if (!topicFailures.has(topic)) {
          topicFailures.set(topic, new Set());
        }
        topicFailures.get(topic)!.add(attempt.userId);
      });

    topicFailures.forEach((employees, topic) => {
      if (employees.size >= 2) {
        // Only show topics with 2+ employees struggling
        trainingGaps.push({
          topic,
          failureCount: employees.size,
          employeeCount: employees.size,
        });
      }
    });

    const sortedGaps = trainingGaps.sort(
      (a, b) => b.employeeCount - a.employeeCount
    );

    return {
      totalEmployees,
      overallCompliance: (
        (policyAckRate + testCompletionRate + testPassRate) /
        3
      ).toFixed(1),
      policyAckRate: policyAckRate.toFixed(1),
      testCompletionRate: testCompletionRate.toFixed(1),
      testPassRate: testPassRate.toFixed(1),
      averageScore: averageScore.toFixed(1),
      failedTests,
      overdueTests,
      employeesRequiringAttention: employeesWithIssues.size,
      trainingGaps: sortedGaps.slice(0, 5),
    };
  },
});

// EMPLOYEE COMPLIANCE DETAILS
export const getEmployeeCompliance = query({
  args: { companyId: v.id("companies"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user || user.companyId !== args.companyId) {
      return null;
    }

    // Get policies
    const policies = await ctx.db
      .query("policies")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const activePolicies = policies.filter((p) => p.status === "active");

    // Get acknowledgements for this employee
    const acknowledgements = await ctx.db
      .query("policyAcknowledgments")
      .filter(
        (q) =>
          q.and(
            q.eq(q.field("userId"), args.userId),
            q.eq(q.field("companyId"), args.companyId)
          )
      )
      .collect();

    const ackedPolicies = new Set(acknowledgements.map((a) => a.policyId));

    // Get quiz attempts for this employee (last 30 days)
    const attempts = await ctx.db
      .query("quizAttempts")
      .filter(
        (q) =>
          q.and(
            q.eq(q.field("userId"), args.userId),
            q.eq(q.field("companyId"), args.companyId),
            q.gt(q.field("completedAt"), Date.now() - 30 * 24 * 60 * 60 * 1000)
          )
      )
      .collect();

    const completedTests = attempts.length;
    const passedTests = attempts.filter(
      (a) => a.score >= (a.passingScore || 70)
    ).length;
    const failedTests = completedTests - passedTests;

    const avgScore =
      completedTests > 0
        ? (attempts.reduce((sum, a) => sum + a.score, 0) / completedTests)
            .toFixed(1)
        : 0;

    // Weak topics
    const topicScores = new Map<string, number[]>();
    attempts.forEach((a) => {
      const topic = a.topic || "General";
      if (!topicScores.has(topic)) {
        topicScores.set(topic, []);
      }
      topicScores.get(topic)!.push(a.score);
    });

    const weakTopics: { topic: string; avgScore: number }[] = [];
    topicScores.forEach((scores, topic) => {
      const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
      if (avg < 70) {
        weakTopics.push({ topic, avgScore: parseFloat(avg.toFixed(1)) });
      }
    });

    return {
      userId: args.userId,
      userName: user.displayName || user.email,
      policiesAcknowledged: ackedPolicies.size,
      policiesOutstanding: Math.max(0, activePolicies.length - ackedPolicies.size),
      totalPolicies: activePolicies.length,
      dailyTestsCompleted: completedTests,
      dailyTestsPassed: passedTests,
      dailyTestsFailed: failedTests,
      averageScore: avgScore,
      weakTopics: weakTopics.sort((a, b) => a.avgScore - b.avgScore),
      recentAttempts: attempts.slice(-5).reverse(),
      trainingStatus:
        failedTests > 2 ? "At Risk" : passedTests > 10 ? "On Track" : "Pending",
    };
  },
});

// DEPARTMENT COMPLIANCE METRICS
export const getDepartmentCompliance = query({
  args: {
    companyId: v.id("companies"),
    departmentId: v.optional(v.id("departments")),
  },
  handler: async (ctx, args) => {
    // Get employees in department
    let employeeQuery = ctx.db.query("users").filter((q) =>
      q.and(
        q.eq(q.field("companyId"), args.companyId),
        q.neq(q.field("role"), "admin")
      )
    );

    const employees = await employeeQuery.collect();

    if (args.departmentId) {
      // Filter by department via employee profiles
      const profiles = await ctx.db
        .query("employeeProfiles")
        .filter((q) => q.eq(q.field("departmentId"), args.departmentId))
        .collect();

      const deptEmployeeIds = new Set(profiles.map((p) => p.userId));
      const deptEmployees = employees.filter((e) => deptEmployeeIds.has(e._id));

      return {
        totalEmployees: deptEmployees.length,
        compliance: await calculateDeptCompliance(ctx, args.companyId, deptEmployees),
      };
    }

    return {
      totalEmployees: employees.length,
      compliance: await calculateDeptCompliance(ctx, args.companyId, employees),
    };
  },
});

async function calculateDeptCompliance(ctx: any, companyId: string, employees: any[]) {
  const attempts = await ctx.db
    .query("quizAttempts")
    .filter(
      (q) =>
        q.and(
          q.eq(q.field("companyId"), companyId),
          q.gt(q.field("completedAt"), Date.now() - 30 * 24 * 60 * 60 * 1000)
        )
    )
    .collect();

  const employeeIds = new Set(employees.map((e) => e._id));
  const relevantAttempts = attempts.filter((a) => employeeIds.has(a.userId));

  const passed = relevantAttempts.filter((a) => a.score >= 70).length;
  const failed = relevantAttempts.filter((a) => a.score < 70).length;
  const passRate =
    relevantAttempts.length > 0
      ? ((passed / relevantAttempts.length) * 100).toFixed(1)
      : 0;

  const avgScore =
    relevantAttempts.length > 0
      ? (relevantAttempts.reduce((sum, a) => sum + a.score, 0) / relevantAttempts.length).toFixed(1)
      : 0;

  return {
    passRate,
    failRate: ((failed / Math.max(1, relevantAttempts.length)) * 100).toFixed(1),
    averageScore: avgScore,
    totalTests: relevantAttempts.length,
  };
}

// TRAINING GAPS ANALYSIS - AI INSIGHTS
export const getTrainingGapsAnalysis = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    const attempts = await ctx.db
      .query("quizAttempts")
      .filter(
        (q) =>
          q.and(
            q.eq(q.field("companyId"), args.companyId),
            q.gt(q.field("completedAt"), Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          )
      )
      .collect();

    // Struggling employees (multiple failed tests)
    const employeeFailures = new Map<string, number>();
    attempts
      .filter((a) => a.score < 70)
      .forEach((a) => {
        employeeFailures.set(a.userId, (employeeFailures.get(a.userId) || 0) + 1);
      });

    const strugglingEmployees = Array.from(employeeFailures.entries())
      .filter(([_, count]) => count >= 2)
      .length;

    // Outstanding tests - quizzes created but not completed
    const quizzes = await ctx.db
      .query("dailyQuizzes")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const recentQuizzes = quizzes.filter(
      (q) => new Date(q.date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    );

    const completedUsers = new Set(attempts.map((a) => a.userId));
    const employees = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const outstandingCount = employees.filter((e) => !completedUsers.has(e._id))
      .length;

    // Topics with most failures
    const topicFailures = new Map<string, number>();
    attempts
      .filter((a) => a.score < 70)
      .forEach((a) => {
        const topic = a.topic || "General";
        topicFailures.set(topic, (topicFailures.get(topic) || 0) + 1);
      });

    const topWeakTopics = Array.from(topicFailures.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([topic, count]) => ({ topic, failureCount: count }));

    return {
      strugglingEmployees,
      outstandingTests: outstandingCount,
      failedTestsLastWeek: attempts.filter((a) => a.score < 70).length,
      topWeakTopics,
      insights: generateInsights(strugglingEmployees, outstandingCount, topWeakTopics),
    };
  },
});

function generateInsights(
  struggling: number,
  outstanding: number,
  weakTopics: { topic: string; failureCount: number }[]
): string[] {
  const insights = [];

  if (struggling >= 5) {
    insights.push(`${struggling} employees are struggling with recent tests.`);
  }

  if (outstanding >= 10) {
    insights.push(`${outstanding} employees have outstanding daily tests.`);
  }

  if (weakTopics.length > 0) {
    const topTopic = weakTopics[0];
    insights.push(
      `"${topTopic.topic}" is the most challenging topic (${topTopic.failureCount} failures).`
    );
  }

  if (insights.length === 0) {
    insights.push("Compliance is strong across the organisation.");
  }

  return insights;
}

// ─────────────────────────────────────────────────────────────
// ENHANCED DASHBOARD QUERIES FOR COMPREHENSIVE VIEW
// ─────────────────────────────────────────────────────────────

// COMPREHENSIVE HR DASHBOARD - ALL DATA AT ONCE
export const getHRDashboardFull = query({
  args: { companyId: v.id("companies") },
  handler: async (ctx, args) => {
    // Get all employees
    const employees = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const activeEmployees = employees.filter((e: any) => e.role !== "admin");
    const totalEmployees = activeEmployees.length;

    if (totalEmployees === 0) {
      return {
        totalEmployees: 0,
        overallCompliance: 0,
        complianceSummary: {
          overallCompliance: 0,
          policyAckRate: 0,
          testCompletionRate: 0,
          testPassRate: 0,
          averageScore: 0,
          failedTests: 0,
          overdueTests: 0,
          employeesRequiringAttention: 0,
        },
        trainingInsights: [],
        trainingGaps: [],
        employeesAtRisk: [],
        departmentMetrics: [],
        recentFailures: [],
      };
    }

    // Get policies
    const policies = await ctx.db
      .query("policies")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const activePolicies = policies.filter((p: any) => p.isActive);

    // Get acknowledgements
    const acknowledgements = await ctx.db
      .query("policyAcknowledgments")
      .collect();

    const employeeIds = new Set(activeEmployees.map((e: any) => e._id));
    const employeesWithAckn = new Set(
      acknowledgements
        .filter((a: any) => employeeIds.has(a.employeeId) && activePolicies.some((p: any) => p._id === a.policyId))
        .map((a: any) => a.employeeId)
    );

    const policyAckRate =
      totalEmployees > 0 ? (employeesWithAckn.size / totalEmployees) * 100 : 0;

    // Get daily quiz attempts (main data source)
    const dailyAttempts = await ctx.db
      .query("dailyQuizAttempts")
      .filter((q) =>
        q.gt(q.field("completedAt"), Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      .collect();

    // Filter to only this company's attempts
    const allAttempts = dailyAttempts.filter((a: any) => employeeIds.has(a.userId));

    const employeesCompletedTests = new Set(allAttempts.map((a: any) => a.userId));
    const testCompletionRate =
      totalEmployees > 0
        ? (employeesCompletedTests.size / totalEmployees) * 100
        : 0;

    const passedAttempts = allAttempts.filter((a: any) => a.score >= 70);
    const testPassRate =
      allAttempts.length > 0
        ? (passedAttempts.length / allAttempts.length) * 100
        : 0;

    const averageScore =
      allAttempts.length > 0
        ? allAttempts.reduce((sum: any, a: any) => sum + a.score, 0) / allAttempts.length
        : 0;

    const failedTests = allAttempts.filter((a: any) => a.score < 70).length;

    // Outstanding tests
    let overdueTests = 0;
    activeEmployees.forEach((emp: any) => {
      if (!employeesCompletedTests.has(emp._id) && allAttempts.length > 0) {
        overdueTests++;
      }
    });

    // Employees requiring attention
    const employeesWithIssues = new Map<string, { failures: number; reasons: string[] }>();
    allAttempts
      .filter((a: any) => a.score < 70)
      .forEach((a: any) => {
        if (!employeesWithIssues.has(a.userId)) {
          employeesWithIssues.set(a.userId, { failures: 0, reasons: [] });
        }
        const record = employeesWithIssues.get(a.userId)!;
        record.failures++;
      });

    activeEmployees.forEach((emp: any) => {
      if (!employeesCompletedTests.has(emp._id)) {
        if (!employeesWithIssues.has(emp._id)) {
          employeesWithIssues.set(emp._id, { failures: 0, reasons: [] });
        }
        const record = employeesWithIssues.get(emp._id)!;
        record.reasons.push("Outstanding tests");
      }
    });

    const employeesAtRisk = Array.from(employeesWithIssues.entries())
      .map(([userId, data]) => {
        const employee = activeEmployees.find((e: any) => e._id === userId);
        return {
          userId,
          name: employee?.displayName || employee?.email || "Unknown",
          email: employee?.email,
          failures: data.failures,
          status:
            data.failures > 3 ? "Critical" : data.failures > 1 ? "At Risk" : "Needs Attention",
          lastAttemptScore: allAttempts
            .filter((a: any) => a.userId === userId)
            .sort((a: any, b: any) => b.completedAt - a.completedAt)[0]?.score || 0,
        };
      })
      .sort((a: any, b: any) => b.failures - a.failures)
      .slice(0, 10);

    // Training gaps analysis
    const topicFailures = new Map<string, Set<string>>();
    allAttempts
      .filter((a: any) => a.score < 70)
      .forEach((attempt: any) => {
        const topic = attempt.topic || "General";
        if (!topicFailures.has(topic)) {
          topicFailures.set(topic, new Set());
        }
        topicFailures.get(topic)!.add(attempt.userId);
      });

    const trainingGaps = Array.from(topicFailures.entries())
      .map(([topic, employees]) => ({
        topic,
        affectedEmployees: employees.size,
        failureCount: employees.size,
      }))
      .sort((a: any, b: any) => b.affectedEmployees - a.affectedEmployees);

    // Generate insights
    const insights: string[] = [];

    if (employeesAtRisk.length > 0) {
      const criticalCount = employeesAtRisk.filter((e: any) => e.status === "Critical").length;
      if (criticalCount > 0) {
        insights.push(`${criticalCount} employees in critical compliance status`);
      }
    }

    if (failedTests > 5) {
      insights.push(`${failedTests} tests failed in the last 30 days`);
    }

    if (overdueTests > 10) {
      insights.push(`${overdueTests} employees have outstanding daily tests`);
    }

    trainingGaps.slice(0, 3).forEach((gap: any) => {
      if (gap.affectedEmployees >= 2) {
        insights.push(`${gap.affectedEmployees} employees struggling with ${gap.topic}`);
      }
    });

    // Department metrics
    const employeeProfiles = await ctx.db
      .query("employeeProfiles")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const departments = await ctx.db
      .query("departments")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const departmentMetrics = await Promise.all(
      departments.map(async (dept: any) => {
        const deptEmployees = employeeProfiles.filter((p: any) => p.departmentId === dept._id);
        const deptEmployeeIds = new Set(deptEmployees.map((p: any) => p.userId));
        const deptAttempts = allAttempts.filter((a: any) => deptEmployeeIds.has(a.userId));

        const passed = deptAttempts.filter((a: any) => a.score >= 70).length;
        const passRateStr =
          deptAttempts.length > 0
            ? ((passed / deptAttempts.length) * 100).toFixed(1)
            : "0";

        const avgScoreStr =
          deptAttempts.length > 0
            ? (deptAttempts.reduce((sum: any, a: any) => sum + a.score, 0) / deptAttempts.length).toFixed(1)
            : "0";

        return {
          departmentId: dept._id,
          departmentName: dept.name,
          employeeCount: deptEmployees.length,
          passRate: parseFloat(passRateStr),
          testCount: deptAttempts.length,
          avgScore: avgScoreStr,
          status: parseFloat(passRateStr) >= 80 ? "Good" : parseFloat(passRateStr) >= 60 ? "Warning" : "Critical",
        };
      })
    );

    // Recent failures
    const recentFailures = allAttempts
      .filter((a: any) => a.score < 70)
      .sort((a: any, b: any) => b.completedAt - a.completedAt)
      .slice(0, 5)
      .map((attempt: any) => {
        const employee = activeEmployees.find((e: any) => e._id === attempt.userId);
        return {
          employeeName: employee?.displayName || employee?.email || "Unknown",
          score: attempt.score,
          totalQuestions: attempt.totalQuestions || 10,
          date: new Date(attempt.completedAt).toLocaleDateString(),
        };
      });

    const overallComplianceStr = (
      (policyAckRate + testCompletionRate + testPassRate) /
      3
    ).toFixed(1);

    return {
      totalEmployees,
      overallCompliance: parseFloat(overallComplianceStr),
      complianceSummary: {
        overallCompliance: parseFloat(overallComplianceStr),
        policyAckRate: parseFloat(policyAckRate.toFixed(1)),
        testCompletionRate: parseFloat(testCompletionRate.toFixed(1)),
        testPassRate: parseFloat(testPassRate.toFixed(1)),
        averageScore: parseFloat(averageScore.toFixed(1)),
        failedTests,
        overdueTests,
        employeesRequiringAttention: employeesWithIssues.size,
      },
      trainingInsights: insights,
      trainingGaps: trainingGaps.slice(0, 5),
      employeesAtRisk,
      departmentMetrics: departmentMetrics.sort((a: any, b: any) => {
        const statusOrder: any = { Critical: 0, Warning: 1, Good: 2 };
        return statusOrder[a.status] - statusOrder[b.status];
      }),
      recentFailures,
    };
  },
});
// DEPARTMENT COMPLIANCE DETAILED - FOR DETAIL SCREEN
export const getDepartmentComplianceDetailed = query({
  args: {
    companyId: v.id("companies"),
    departmentId: v.id("departments"),
  },
  handler: async (ctx, args) => {
    // Get department info
    const department = await ctx.db.get(args.departmentId);
    if (!department) return null;

    // Get employees in this department
    const employeeProfiles = await ctx.db
      .query("employeeProfiles")
      .filter((q) => q.eq(q.field("departmentId"), args.departmentId))
      .collect();

    const deptEmployeeIds = new Set(employeeProfiles.map((p) => p.userId));
    const employees = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("companyId"), args.companyId))
      .collect();

    const deptEmployees = employees.filter((e) => deptEmployeeIds.has(e._id));

    // Get quiz attempts for department
    const allAttempts = await ctx.db
      .query("dailyQuizAttempts")
      .filter((q) =>
        q.gt(q.field("completedAt"), Date.now() - 30 * 24 * 60 * 60 * 1000)
      )
      .collect();

    const deptAttempts = allAttempts.filter((a) => deptEmployeeIds.has(a.userId));

    // Calculate metrics
    const passedAttempts = deptAttempts.filter((a) => a.score >= 70);
    const passRate =
      deptAttempts.length > 0
        ? (passedAttempts.length / deptAttempts.length) * 100
        : 0;

    const avgScore =
      deptAttempts.length > 0
        ? deptAttempts.reduce((sum, a) => sum + a.score, 0) / deptAttempts.length
        : 0;

    // Training gaps for this department
    const topicFailures = new Map();
    deptAttempts
      .filter((a) => a.score < 70)
      .forEach((attempt) => {
        const topic = attempt.topic || "General";
        if (!topicFailures.has(topic)) {
          topicFailures.set(topic, new Set());
        }
        topicFailures.get(topic).add(attempt.userId);
      });

    const trainingGaps = Array.from(topicFailures.entries())
      .map(([topic, empSet]) => ({
        topic,
        affectedEmployees: empSet.size,
        failureCount: empSet.size,
      }))
      .sort((a, b) => b.affectedEmployees - a.affectedEmployees);

    // Employee details
    const employeeMetrics = deptEmployees.map((emp) => {
      const empAttempts = deptAttempts.filter((a) => a.userId === emp._id);
      const empPassed = empAttempts.filter((a) => a.score >= 70).length;
      const empAvgScore =
        empAttempts.length > 0
          ? empAttempts.reduce((sum, a) => sum + a.score, 0) / empAttempts.length
          : 0;

      return {
        id: emp._id,
        name: emp.displayName || emp.email,
        email: emp.email,
        testCount: empAttempts.length,
        passCount: empPassed,
        avgScore: empAvgScore.toFixed(1),
        status: empPassed > 3 ? "compliant" : empAttempts.length > 0 ? "at-risk" : "pending",
      };
    });

    return {
      metrics: {
        employeeCount: deptEmployees.length,
        passRate: passRate.toFixed(1),
        avgScore: avgScore.toFixed(1),
        testCount: deptAttempts.length,
        status: passRate >= 80 ? "Good" : passRate >= 60 ? "Warning" : "Critical",
      },
      employees: employeeMetrics,
      trainingGaps: trainingGaps.slice(0, 5),
    };
  },
});
