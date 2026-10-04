import { v } from "convex/values";
import { mutation, query, internalMutation, internalAction, internalQuery, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { requireCompanyMember, requireCompanyManager } from "./security";

// ─── Constants ──────────────────────────────────────────────────────
const QUESTIONS_PER_QUIZ = 5;
const PASS_THRESHOLD = 70;
const MAX_ATTEMPTS_BEFORE_NOTIFY = 3;
const THREE_DAYS_MS = 3 * 24 * 60 * 60 * 1000;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const QUIZ_STYLES = ["original", "scenario", "truefalse", "quickcheck"] as const;
type QuizStyle = "original" | "scenario" | "truefalse" | "quickcheck";

// 5 question categories — each quiz generates one question per category
const QUESTION_CATEGORIES = [
  "understanding",   // What is allowed / not allowed
  "application",     // What would you do in this scenario?
  "reporting",       // Reporting & escalation procedures
  "responsibility",  // Who is responsible for what?
  "consequences",    // What happens if you don't comply?
] as const;

// Daily focus rotation — determines emphasis for the day
const DAILY_FOCUS = [
  "understanding",    // Monday / Day 0
  "application",      // Tuesday / Day 1
  "reporting",        // Wednesday / Day 2
  "responsibility",   // Thursday / Day 3
  "consequences",     // Friday / Day 4
  "application",      // Saturday / Day 5
  "understanding",    // Sunday / Day 6
] as const;

function getTodayString(): string {
  const now = new Date();
  return now.toISOString().split("T")[0];
}

function getDateStringDaysAgo(days: number): string {
  const date = new Date();
  date.setUTCDate(date.getUTCDate() - days);
  return date.toISOString().split("T")[0];
}

function getDaysSince(timestamp: number): number {
  return Math.floor((Date.now() - timestamp) / (24 * 60 * 60 * 1000));
}

function getDayOfWeek(): number {
  return new Date().getDay(); // 0=Sunday, 1=Monday, etc.
}

// ─── Fallback template questions (category-aware) ────────────────────
function generateFallbackQuestions(
  policies: Array<{ title: string; content: string; policyType: string }>,
  count: number,
  style: QuizStyle = "original"
): Array<{
  question: string;
  options: string[];
  correctAnswer: number;
  explanation: string;
  sourcePolicyTitle: string;
  category: string;
}> {
  const questions: Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    sourcePolicyTitle: string;
    category: string;
  }> = [];

  const policy = policies[0] || { title: "Company Policy", content: "" };

  const templates = [
    {
      category: "understanding",
      question: `According to the "${policy.title}" policy, what is the primary requirement?`,
      options: [
        "Follow all outlined procedures exactly",
        "Only apply during work hours",
        "Ignore if not directly relevant to your role",
        "Apply only when supervised",
      ],
      correctAnswer: 0,
      explanation: `The ${policy.title} policy requires all outlined procedures to be followed.`,
    },
    {
      category: "application",
      question: `You encounter a situation covered by the "${policy.title}" policy. What should you do first?`,
      options: [
        "Handle it yourself based on experience",
        "Follow the procedure outlined in the policy",
        "Wait for someone else to act",
        "Skip if it seems minor",
      ],
      correctAnswer: 1,
      explanation: "Always follow the documented procedure first.",
    },
    {
      category: "reporting",
      question: `When must incidents related to "${policy.title}" be reported?`,
      options: [
        "At the end of the week",
        "Only if someone is injured",
        "Immediately to the line manager",
        "Only during safety meetings",
      ],
      correctAnswer: 2,
      explanation: "Incidents must be reported immediately to the line manager.",
    },
    {
      category: "responsibility",
      question: `Who is responsible for ensuring compliance with the "${policy.title}" policy?`,
      options: [
        "Only senior management",
        "Only the safety officer",
        "All employees within the organization",
        "Only contractors",
      ],
      correctAnswer: 2,
      explanation: "All employees are responsible for compliance.",
    },
    {
      category: "consequences",
      question: `What could happen if the "${policy.title}" policy is not followed?`,
      options: [
        "Nothing, it's just a guideline",
        "A verbal warning only",
        "Serious injury, legal consequences, or disciplinary action",
        "A small fine",
      ],
      correctAnswer: 2,
      explanation: "Non-compliance can lead to serious injury, legal consequences, or disciplinary action.",
    },
  ];

  if (style === "truefalse") {
    const tfQuestions = templates.slice(0, count).map((template, index) => ({
      ...template,
      options: ["True", "False"],
      correctAnswer: 0,
      explanation: index === 0
        ? template.explanation
        : `${template.explanation} In true/false mode, the correct answer is shown as True when the statement matches the policy.`,
      sourcePolicyTitle: policy.title,
    }));
    return tfQuestions;
  }

  if (style === "scenario") {
    return templates.slice(0, count).map((template, index) => ({
      ...template,
      question: `Scenario ${index + 1}: ${template.question}`,
      explanation: `Scenario-based quiz style: ${template.explanation}`,
      sourcePolicyTitle: policy.title,
    }));
  }

  if (style === "quickcheck") {
    return templates.slice(0, count).map((template) => ({
      ...template,
      question: `Quick check: ${template.question}`,
      explanation: `Quick check style: ${template.explanation}`,
      sourcePolicyTitle: policy.title,
    }));
  }

  for (let i = 0; i < Math.min(count, templates.length); i++) {
    questions.push({
      ...templates[i],
      sourcePolicyTitle: policy.title,
    });
  }

  return questions.slice(0, count);
}

// ─── Internal query: get data needed for daily generation ─────────────
export const getCompanyGenerationData = internalQuery({
  args: { companyId: v.id("companies") },
  returns: v.any(),
  async handler(ctx, args) {
    const company = await ctx.db.get(args.companyId);
    if (!company) {
      return null;
    }

    const policies = await ctx.db
      .query("policies")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const activePolicies = policies.filter((p: any) => p.isActive);
    if (activePolicies.length === 0) return null;

    const groups = await ctx.db
      .query("employeeGroups")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const dateFor = getTodayString();

    const existingQuizzes = await ctx.db
      .query("dailyQuizzes")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .collect();

    if (existingQuizzes.length > 0) return null; // Already generated

    // Get policy cycle tracker to determine which policy to use next
    const cycleTrackers = await ctx.db
      .query("policyCycleTracker")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    return {
      companyId: args.companyId,
      activePolicies: activePolicies.map((p: any) => ({
        _id: p._id,
        title: p.title,
        content: p.content,
        policyType: p.policyType,
        targetGroupIds: p.targetGroupIds,
      })),
      groups: groups.map((g: any) => ({
        _id: g._id,
        name: g.name,
      })),
      cycleTrackers: cycleTrackers.map((ct: any) => ({
        _id: ct._id,
        policyId: ct.policyId,
        lastUsedDate: ct.lastUsedDate,
        cycleNumber: ct.cycleNumber,
      })),
      dateFor,
      questionCount: Math.max(3, Math.min(20, company.quizQuestionCount || QUESTIONS_PER_QUIZ)),
      quizStyle: (company.quizStyle || "original") as QuizStyle,
    };
  },
});

// ─── Internal mutation: save a reading script ────────────────────────
export const saveReadingScript = internalMutation({
  args: {
    title: v.string(),
    content: v.string(),
    companyId: v.id("companies"),
    scriptType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    sourcePolicyIds: v.array(v.id("policies")),
    dateFor: v.string(),
  },
  returns: v.id("readingScripts"),
  async handler(ctx, args) {
    return await ctx.db.insert("readingScripts", {
      title: args.title,
      content: args.content,
      companyId: args.companyId,
      scriptType: args.scriptType,
      targetGroupIds: args.targetGroupIds,
      sourcePolicyIds: args.sourcePolicyIds,
      dateFor: args.dateFor,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// ─── Internal mutation: save a daily quiz shell ─────────────────────
export const saveDailyQuizShell = internalMutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    companyId: v.id("companies"),
    quizType: v.union(v.literal("general"), v.literal("group")),
    targetGroupIds: v.optional(v.array(v.id("employeeGroups"))),
    sourcePolicyIds: v.array(v.id("policies")),
    scriptId: v.optional(v.id("readingScripts")),
    dateFor: v.string(),
    questionCount: v.optional(v.number()),
    quizStyle: v.optional(v.union(
      v.literal("original"),
      v.literal("scenario"),
      v.literal("truefalse"),
      v.literal("quickcheck")
    )),
  },
  returns: v.id("dailyQuizzes"),
  async handler(ctx, args) {
    return await ctx.db.insert("dailyQuizzes", {
      title: args.title,
      description: args.description,
      companyId: args.companyId,
      quizType: args.quizType,
      targetGroupIds: args.targetGroupIds,
      sourcePolicyIds: args.sourcePolicyIds,
      scriptId: args.scriptId,
      questionCount: args.questionCount,
      quizStyle: args.quizStyle,
      dateFor: args.dateFor,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// ─── Internal mutation: update policy cycle tracker ─────────────────
export const updatePolicyCycleTracker = internalMutation({
  args: {
    companyId: v.id("companies"),
    policyId: v.id("policies"),
    dateFor: v.string(),
    cycleNumber: v.number(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const existing = await ctx.db
      .query("policyCycleTracker")
      .withIndex("by_company_and_policy", (q: any) =>
        q.eq("companyId", args.companyId).eq("policyId", args.policyId)
      )
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        lastUsedDate: args.dateFor,
        cycleNumber: args.cycleNumber,
      });
    } else {
      await ctx.db.insert("policyCycleTracker", {
        companyId: args.companyId,
        policyId: args.policyId,
        lastUsedDate: args.dateFor,
        cycleNumber: args.cycleNumber,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});

// ─── Helper: pick next policy in rotation ────────────────────────────
function pickNextPolicy(
  policies: Array<{ _id: string; title: string; content: string; policyType: string }>,
  cycleTrackers: Array<{ policyId: string; lastUsedDate: string; cycleNumber: number }>
): { policy: (typeof policies)[number]; cycleNumber: number } {
  if (policies.length === 0) {
    throw new Error("No policies available");
  }

  // Find policies that haven't been used in the current cycle
  const trackerMap = new Map(cycleTrackers.map(ct => [ct.policyId, ct]));
  const maxCycle = cycleTrackers.length > 0
    ? Math.max(...cycleTrackers.map(ct => ct.cycleNumber))
    : 0;

  // Policies not yet covered in the current cycle
  const uncoveredPolicies = policies.filter(p => {
    const tracker = trackerMap.get(p._id);
    return !tracker || tracker.cycleNumber < maxCycle;
  });

  if (uncoveredPolicies.length > 0) {
    // Pick the one not used most recently (or never used)
    const sorted = uncoveredPolicies.sort((a, b) => {
      const aTracker = trackerMap.get(a._id);
      const bTracker = trackerMap.get(b._id);
      if (!aTracker) return -1;
      if (!bTracker) return 1;
      return aTracker.lastUsedDate.localeCompare(bTracker.lastUsedDate);
    });
    return { policy: sorted[0], cycleNumber: maxCycle };
  }

  // All policies covered — start a new cycle
  const newCycle = maxCycle + 1;
  // Pick least recently used for the new cycle
  const sorted = [...policies].sort((a, b) => {
    const aTracker = trackerMap.get(a._id);
    const bTracker = trackerMap.get(b._id);
    if (!aTracker) return -1;
    if (!bTracker) return 1;
    return aTracker.lastUsedDate.localeCompare(bTracker.lastUsedDate);
  });
  return { policy: sorted[0], cycleNumber: newCycle };
}

// ─── Helper: Generate substantial reading material from policy via LLM ──
async function generateReadingMaterial(
  policy: { title: string; content: string },
  dailyFocus: string
): Promise<string> {
  try {
    const truncatedContent = policy.content.substring(0, 5000);
    const response = await globalThis.fetch("https://api.a0.dev/ai/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a workplace training content writer. Create a comprehensive, easy-to-read study material from the provided policy document. The material must:

1. Be at least 800 words long (substantial reading)
2. Cover ALL key points, procedures, rules, and requirements from the policy
3. Include specific details, numbers, deadlines, and examples mentioned in the policy
4. Break content into clear sections with headers
5. Highlight important terms and definitions
6. Include practical examples of how to apply the policy
7. Today's focus area is "${dailyFocus}" — give extra detail on aspects related to this topic
8. End with a "Key Takeaways" section summarizing the most important points

FORMAT:
- Use clear section headers (e.g., "Overview", "Key Requirements", "Your Responsibilities", "Reporting Procedures", "Key Takeaways")
- Write in plain language that any employee can understand
- Include specific facts and details from the policy that employees will be quizzed on
- DO NOT add information that is not in the original policy

The goal is that an employee who carefully reads this material should be able to answer any question about the policy correctly.`,
          },
          {
            role: "user",
            content: `Create study material from this policy:\n\nPOLICY TITLE: "${policy.title}"\n\nPOLICY CONTENT:\n${truncatedContent}`,
          },
        ],
      }),
    });

    if (response.ok) {
      const data = await response.json();
      if (data.completion && data.completion.length > 200) {
        return data.completion;
      }
    }
  } catch (error: any) {
    console.error("Failed to generate reading material:", error?.message || error);
  }

  // Fallback: structured version of the raw policy
  return `STUDY MATERIAL: ${policy.title}\n\n` +
    `Overview\n` +
    `This document covers the key requirements and procedures outlined in the "${policy.title}" policy. ` +
    `Please read carefully — you will be quizzed on this material.\n\n` +
    `Policy Content\n` +
    `${policy.content}\n\n` +
    `Key Takeaways\n` +
    `- Familiarize yourself with all requirements in the "${policy.title}" policy\n` +
    `- Know the reporting procedures and escalation paths\n` +
    `- Understand your responsibilities and the consequences of non-compliance\n` +
    `- When in doubt, refer to this policy or ask your manager`;
}

// ─── Helper: call a0 LLM API with category-based generation ─────────
async function generateQuestionsWithLLM(
  policies: Array<{ title: string; content: string; policyType: string }>,
  readingMaterial: string,
  questionCount: number,
  seed: number,
  previousQuestions: string[],
  dailyFocus: string,
  quizStyle: QuizStyle = "original"
): Promise<
  Array<{
    question: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    sourcePolicyTitle: string;
    category: string;
  }>
> {
  try {
    // Build combined content block — use both policy and reading material
    const policyBlocks = policies
      .map((p, i) => {
        const truncated = p.content.substring(0, 3000);
        return `--- POLICY ${i + 1}: "${p.title}" (Type: ${p.policyType}) ---\n${truncated}`;
      })
      .join("\n\n");

    const readingBlock = readingMaterial
      ? `\n\n--- READING MATERIAL PROVIDED TO EMPLOYEES ---\n${readingMaterial.substring(0, 4000)}`
      : "";

    // Build exclusion list from recent question history
    const exclusionBlock = previousQuestions.length > 0
      ? `\n\nPREVIOUSLY ASKED QUESTIONS (DO NOT repeat or rephrase these):\n${previousQuestions.map((q, i) => `${i + 1}. ${q}`).join("\n")}`
      : "";

    const response = await globalThis.fetch("https://api.a0.dev/ai/llm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: `You are a workplace training quiz generator. Generate exactly ${questionCount} unique multiple-choice questions.

CRITICAL: Questions MUST be answerable ONLY from the reading material and policy provided. Ask about SPECIFIC facts, numbers, procedures, and details mentioned in the material. Do NOT ask generic questions.

QUESTION CATEGORIES — Generate exactly ONE question from EACH category:
1. UNDERSTANDING — Ask about a SPECIFIC rule, requirement, or fact stated in the policy. Reference exact details.
2. APPLICATION — Present a realistic workplace scenario and ask what the correct action is ACCORDING TO THIS SPECIFIC POLICY.
3. REPORTING — Ask about SPECIFIC reporting procedures, timelines, or escalation paths mentioned in the policy.
4. RESPONSIBILITY — Ask who specifically is responsible for a particular action or decision as stated in the policy.
5. CONSEQUENCES — Ask about SPECIFIC consequences, penalties, or outcomes mentioned for non-compliance.

TODAY'S FOCUS: ${dailyFocus} — Make the "${dailyFocus}" category question more detailed and scenario-based.

QUIZ STYLE: ${quizStyle}
- original = keep the current company quiz format exactly as written above
- scenario = make each question more workplace-scenario driven
- truefalse = still return multiple choice questions but use a true/false structure
- quickcheck = shorter, simpler check-for-understanding questions

CRITICAL RULES:
- Every question MUST reference SPECIFIC content from the provided material (exact procedures, numbers, names, deadlines)
- Each question must have exactly 4 options with only ONE correct answer unless quiz style is truefalse, where exactly 2 options are allowed
- The correct answer MUST be verifiable from the reading material
- Wrong answers should be plausible but clearly incorrect based on the material
- NEVER repeat a question that is semantically similar to any in the PREVIOUSLY ASKED list
- Each question must test a DIFFERENT specific aspect of the policy
- Use randomization seed ${seed} to vary which specific aspects you focus on

Respond with ONLY a valid JSON array, no markdown, no extra text.`,
          },
          {
            role: "user",
            content: `Here are the policies and reading material to generate questions from:\n\n${policyBlocks}${readingBlock}${exclusionBlock}\n\nGenerate ${questionCount} questions in this exact JSON format:\n[{"question": "...", "options": ["A", "B", "C", "D"], "correctAnswer": 0, "explanation": "...", "sourcePolicyTitle": "...", "category": "understanding|application|reporting|responsibility|consequences"}]`,
          },
        ],
      }),
    });

    if (!response.ok) {
      console.error("LLM API error:", response.status);
      return generateFallbackQuestions(policies, questionCount);
    }

    const data = await response.json();

    if (data.completion) {
      const text = data.completion;
      const jsonMatch = text.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        const questions = JSON.parse(jsonMatch[0]);
        if (Array.isArray(questions) && questions.length >= questionCount) {
          return questions.slice(0, questionCount).map((q: any) => ({
            question: String(q.question || ""),
            options: Array.isArray(q.options)
              ? q.options.map((o: any) => String(o))
              : ["A", "B", "C", "D"],
            correctAnswer: typeof q.correctAnswer === "number" ? q.correctAnswer : 0,
            explanation: String(q.explanation || ""),
            sourcePolicyTitle: String(q.sourcePolicyTitle || ""),
            category: String(q.category || "understanding"),
          }));
        }
      }
    }
  } catch (error: any) {
    console.error("LLM question generation failed:", error?.message || error);
  }

  return generateFallbackQuestions(policies, questionCount);
}

// ─── Internal query: get user's relevant policies for quiz generation ─
export const getUserPoliciesForQuiz = internalQuery({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.any(),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;

    const policies = await ctx.db
      .query("policies")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const activePolicies = policies.filter((p: any) => p.isActive);
    const userGroups = user.groupIds || [];

    const relevantPolicies: Array<{
      title: string;
      content: string;
      policyType: string;
    }> = [];

    for (const policy of activePolicies) {
      if (policy.policyType === "general") {
        relevantPolicies.push({
          title: policy.title,
          content: policy.content,
          policyType: "general",
        });
      } else if (policy.policyType === "group" && policy.targetGroupIds) {
        const isInGroup = policy.targetGroupIds.some((gId: any) =>
          userGroups.includes(gId)
        );
        if (isInGroup) {
          relevantPolicies.push({
            title: policy.title,
            content: policy.content,
            policyType: "group",
          });
        }
      }
    }

    return relevantPolicies;
  },
});

// ─── Internal query: get recent question history for a company ────────
export const getRecentQuestionHistory = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.array(v.string()),
  async handler(ctx, args) {
    // Get questions from the last 7 days to avoid repetition
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];

    const history = await ctx.db
      .query("questionHistory")
      .withIndex("by_company_and_date", (q: any) =>
        q.eq("companyId", args.companyId).gte("dateAsked", cutoffDate)
      )
      .collect();

    return history.map((h: any) => h.questionText);
  },
});

// ─── Internal mutation: save question history ─────────────────────────
export const saveQuestionHistory = internalMutation({
  args: {
    companyId: v.id("companies"),
    questions: v.array(v.object({
      policyTitle: v.string(),
      questionText: v.string(),
      category: v.string(),
    })),
    dateFor: v.string(),
  },
  returns: v.null(),
  async handler(ctx, args) {
    for (const q of args.questions) {
      await ctx.db.insert("questionHistory", {
        companyId: args.companyId,
        policyTitle: q.policyTitle,
        questionText: q.questionText,
        category: q.category,
        dateAsked: args.dateFor,
        createdAt: Date.now(),
      });
    }
    return null;
  },
});

// ─── Internal mutation: save fresh questions for a quiz ───────────────
export const saveFreshQuizQuestions = internalMutation({
  args: {
    quizId: v.id("dailyQuizzes"),
    questions: v.array(
      v.object({
        question: v.string(),
        options: v.array(v.string()),
        correctAnswer: v.number(),
        explanation: v.string(),
        sourcePolicyTitle: v.optional(v.string()),
        category: v.optional(v.string()),
      })
    ),
  },
  returns: v.null(),
  async handler(ctx, args) {
    // Delete any existing questions for this quiz
    const existing = await ctx.db
      .query("dailyQuizQuestions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();

    for (const q of existing) {
      await ctx.db.delete(q._id);
    }

    // Insert fresh questions
    for (let i = 0; i < args.questions.length; i++) {
      const q = args.questions[i];
      await ctx.db.insert("dailyQuizQuestions", {
        quizId: args.quizId,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        policyRef: q.sourcePolicyTitle,
        order: i + 1,
        createdAt: Date.now(),
      });
    }

    // Mark quiz as questions ready
    await ctx.db.patch(args.quizId, { questionsReady: true });

    return null;
  },
});

// ─── Internal mutation: queue daily content generation ───────────────
export const queueDailyContentGeneration = internalMutation({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const dateFor = getTodayString();
    const existing = await ctx.db
      .query("dailyQuizzes")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .first();

    if (existing) {
      return null;
    }

    await ctx.scheduler.runAfter(
      0,
      internal.dailyQuizzes.generateDailyContentForCompany,
      { companyId: args.companyId }
    );

    return null;
  },
});

// ─── Internal mutation: queue quiz question generation ───────────────
export const queueQuizQuestionGeneration = internalMutation({
  args: {
    quizId: v.id("dailyQuizzes"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) {
      return null;
    }

    const existingQuestions = await ctx.db
      .query("dailyQuizQuestions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .first();

    if (existingQuestions) {
      return null;
    }

    await ctx.scheduler.runAfter(
      0,
      internal.dailyQuizzes.generateQuizQuestionsBackground,
      { quizId: args.quizId }
    );

    return null;
  },
});

// ─── Internal action: generate content for one policy (script + quiz + questions) ──
async function generateContentForPolicy(
  ctx: any,
  args: {
    companyId: any;
    policy: any;
    dateFor: string;
    previousQuestions: string[];
    quizType: "general" | "group";
    targetGroupIds?: any[];
    groupName?: string;
    questionCount?: number;
    quizStyle?: QuizStyle;
  }
) {
  const { companyId, policy, dateFor, previousQuestions, quizType, targetGroupIds, groupName, questionCount = QUESTIONS_PER_QUIZ, quizStyle = "original" } = args;
  const dayOfWeek = getDayOfWeek();
  const dailyFocus = DAILY_FOCUS[dayOfWeek];

  // 1. Generate substantial reading material from the policy
  let readingContent: string;
  try {
    readingContent = await generateReadingMaterial(policy, dailyFocus);
  } catch (e: any) {
    console.error("Reading material generation failed:", e?.message);
    readingContent = `STUDY MATERIAL: ${policy.title}\n\n${policy.content}`;
  }

  const scriptTitle = groupName
    ? `${groupName}: ${policy.title}`
    : `Daily Reading: ${policy.title}`;

  const scriptId = await ctx.runMutation(
    internal.dailyQuizzes.saveReadingScript,
    {
      title: scriptTitle,
      content: readingContent,
      companyId,
      scriptType: quizType as "general" | "group",
      targetGroupIds,
      sourcePolicyIds: [policy._id],
      dateFor,
    }
  );

  // 2. Create quiz shell
  const quizTitle = groupName ? `${groupName} Quiz` : `Daily Quiz`;
  const quizDescription = groupName
    ? `Quiz for ${groupName}: ${policy.title}`
    : `Quiz based on today's reading: ${policy.title}`;

  const quizId = await ctx.runMutation(internal.dailyQuizzes.saveDailyQuizShell, {
    title: quizTitle,
    description: quizDescription,
    companyId,
    quizType: quizType as "general" | "group",
    targetGroupIds,
    sourcePolicyIds: [policy._id],
    scriptId,
    dateFor,
  });

  // 3. Pre-generate questions — try LLM first, always fall back to template questions
  try {
    const seed = Date.now() + Math.floor(Math.random() * 100000);
    const questions = await generateQuestionsWithLLM(
      [{ title: policy.title, content: policy.content, policyType: policy.policyType }],
      readingContent,
      questionCount,
      seed,
      previousQuestions,
      dailyFocus,
      quizStyle
    );

    // 4. Save pre-generated questions (this also sets questionsReady = true)
    await ctx.runMutation(internal.dailyQuizzes.saveFreshQuizQuestions, {
      quizId,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sourcePolicyTitle: q.sourcePolicyTitle,
        category: q.category,
      })),
    });

    // 5. Save to question history
    await ctx.runMutation(internal.dailyQuizzes.saveQuestionHistory, {
      companyId,
      questions: questions.map((q) => ({
        policyTitle: q.sourcePolicyTitle,
        questionText: q.question,
        category: q.category || "understanding",
      })),
      dateFor,
    });
  } catch (e: any) {
    console.error("Question generation failed, saving fallback:", e?.message);
    // Save fallback questions so the quiz is never empty
    const fallbackQuestions = generateFallbackQuestions(
      [{ title: policy.title, content: policy.content, policyType: policy.policyType }],
      questionCount,
      quizStyle
    );
    await ctx.runMutation(internal.dailyQuizzes.saveFreshQuizQuestions, {
      quizId,
      questions: fallbackQuestions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sourcePolicyTitle: q.sourcePolicyTitle,
        category: q.category,
      })),
    });
  }
}

// ─── Internal action: generate questions for one quiz in the background ─
export const generateQuizQuestionsBackground = internalAction({
  args: { quizId: v.id("dailyQuizzes") },
  returns: v.null(),
  async handler(ctx, args) {
    const data: any = await ctx.runQuery(
      internal.dailyQuizzes.getQuizDataForGeneration,
      { quizId: args.quizId }
    );

    if (!data) {
      return null;
    }

    const { policies, readingContent, previousQuestions, companyId, dateFor, questionCount, quizStyle } = data;
    if (policies.length === 0) {
      return null;
    }

    const dayOfWeek = getDayOfWeek();
    const dailyFocus = DAILY_FOCUS[dayOfWeek];
    const seed = Date.now() + Math.floor(Math.random() * 100000);

    const questions = await generateQuestionsWithLLM(
      policies,
      readingContent,
      questionCount || QUESTIONS_PER_QUIZ,
      seed,
      previousQuestions,
      dailyFocus,
      (quizStyle || "original") as QuizStyle
    );

    await ctx.runMutation(internal.dailyQuizzes.saveFreshQuizQuestions, {
      quizId: args.quizId,
      questions: questions.map((q) => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation,
        sourcePolicyTitle: q.sourcePolicyTitle,
        category: q.category,
      })),
    });

    await ctx.runMutation(internal.dailyQuizzes.saveQuestionHistory, {
      companyId,
      questions: questions.map((q) => ({
        policyTitle: q.sourcePolicyTitle,
        questionText: q.question,
        category: q.category || "understanding",
      })),
      dateFor,
    });

    return null;
  },
});

// ─── Internal action: orchestrate daily content for one company ──────
export const generateDailyContentForCompany = internalAction({
  args: { companyId: v.id("companies") },
  returns: v.null(),
  async handler(ctx, args) {
    const data: any = await ctx.runQuery(
      internal.dailyQuizzes.getCompanyGenerationData,
      { companyId: args.companyId }
    );
    if (!data) return null;

    const { activePolicies, groups, dateFor, cycleTrackers, questionCount, quizStyle } = data;

    // Get recent question history
    const previousQuestions: string[] = await ctx.runQuery(
      internal.dailyQuizzes.getRecentQuestionHistory,
      { companyId: args.companyId }
    );

    const generalPolicies = activePolicies.filter(
      (p: any) => p.policyType === "general"
    );
    const groupPolicies = activePolicies.filter(
      (p: any) => p.policyType === "group"
    );

    // Generate general reading script + quiz + pre-generated questions
    if (generalPolicies.length > 0) {
      const generalTrackers = cycleTrackers.filter((ct: any) =>
        generalPolicies.some((p: any) => p._id === ct.policyId)
      );

      const { policy, cycleNumber } = pickNextPolicy(generalPolicies, generalTrackers);

      // Update cycle tracker
      await ctx.runMutation(internal.dailyQuizzes.updatePolicyCycleTracker, {
        companyId: args.companyId,
        policyId: policy._id,
        dateFor,
        cycleNumber,
      });

      await generateContentForPolicy(ctx, {
        companyId: args.companyId,
        policy,
        dateFor,
        previousQuestions,
        quizType: "general",
        questionCount,
        quizStyle,
      });
    }

    // Generate group-specific content
    for (const group of groups) {
      const groupSpecificPolicies = groupPolicies.filter((p: any) =>
        p.targetGroupIds?.includes(group._id)
      );
      if (groupSpecificPolicies.length === 0) continue;

      const groupTrackers = cycleTrackers.filter((ct: any) =>
        groupSpecificPolicies.some((p: any) => p._id === ct.policyId)
      );

      const { policy, cycleNumber } = pickNextPolicy(groupSpecificPolicies, groupTrackers);

      // Update cycle tracker for group policy
      await ctx.runMutation(internal.dailyQuizzes.updatePolicyCycleTracker, {
        companyId: args.companyId,
        policyId: policy._id,
        dateFor,
        cycleNumber,
      });

      await generateContentForPolicy(ctx, {
        companyId: args.companyId,
        policy,
        dateFor,
        previousQuestions,
        quizType: "group",
        targetGroupIds: [group._id],
        groupName: group.name,
        questionCount,
        quizStyle,
      });
    }

    return null;
  },
});

// ─── Cron entry point: schedule generation for all companies ─────────
export const generateAllDailyContent = internalMutation({
  args: {},
  returns: v.null(),
  async handler(ctx) {
    const companies = await ctx.db.query("companies").collect();

    for (const company of companies) {
      await ctx.scheduler.runAfter(
        0,
        internal.dailyQuizzes.generateDailyContentForCompany,
        { companyId: company._id }
      );
    }

    return null;
  },
});

// ─── Public action: ensure today's content exists (on-demand safety net) ──
export const ensureTodayContent = action({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.object({
    generated: v.boolean(),
  }),
  async handler(ctx, args) {
    const hasContent: boolean = await ctx.runQuery(
      internal.dailyQuizzes.hasTodayContent,
      { companyId: args.companyId }
    );

    if (hasContent) {
      return { generated: false };
    }

    await ctx.runMutation(internal.dailyQuizzes.queueDailyContentGeneration, {
      companyId: args.companyId,
    });

    return { generated: true };
  },
});

// ─── Internal query: check if today's content exists ─────────────────
export const hasTodayContent = internalQuery({
  args: { companyId: v.id("companies") },
  returns: v.boolean(),
  async handler(ctx, args) {
    const dateFor = getTodayString();
    const existing = await ctx.db
      .query("dailyQuizzes")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .first();
    return !!existing;
  },
});

// ─── Internal query: get quiz data for on-demand question generation ──
export const getQuizDataForGeneration = internalQuery({
  args: { quizId: v.id("dailyQuizzes") },
  returns: v.any(),
  async handler(ctx, args) {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return null;

    // Check if questions already exist
    const existingQuestions = await ctx.db
      .query("dailyQuizQuestions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();
    if (existingQuestions.length > 0) return null; // Already has questions

    // Get source policies
    const policies: any[] = [];
    for (const pId of quiz.sourcePolicyIds) {
      const p = await ctx.db.get(pId);
      if (p) policies.push({ _id: p._id, title: p.title, content: p.content, policyType: p.policyType });
    }

    // Get reading material if available
    let readingContent = "";
    if (quiz.scriptId) {
      const script = await ctx.db.get(quiz.scriptId);
      if (script) readingContent = script.content;
    }

    // Get recent question history
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const cutoffDate = sevenDaysAgo.toISOString().split("T")[0];
    const history = await ctx.db
      .query("questionHistory")
      .withIndex("by_company_and_date", (q: any) =>
        q.eq("companyId", quiz.companyId).gte("dateAsked", cutoffDate)
      )
      .collect();

    return {
      quizId: quiz._id,
      companyId: quiz.companyId,
      dateFor: quiz.dateFor,
      policies,
      readingContent,
      previousQuestions: history.map((h: any) => h.questionText),
    };
  },
});

// ─── Public action: generate questions on-demand for a quiz ───────────
export const generateQuizQuestionsNow = action({
  args: { quizId: v.id("dailyQuizzes") },
  returns: v.object({ generated: v.boolean() }),
  async handler(ctx, args) {
    const quiz = await ctx.runQuery(
      internal.dailyQuizzes.getQuizDataForGeneration,
      { quizId: args.quizId }
    );

    if (!quiz) {
      return { generated: false }; // Already has questions or quiz not found
    }

    await ctx.runMutation(internal.dailyQuizzes.queueQuizQuestionGeneration, {
      quizId: args.quizId,
    });

    return { generated: true };
  },
});

// ─── Public queries & mutations ──────────────────────────────────────

// Get today's scripts for a user
export const getTodayScripts = query({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.array(
    v.object({
      _id: v.id("readingScripts"),
      title: v.string(),
      content: v.string(),
      scriptType: v.string(),
      isRead: v.boolean(),
      canTakeQuiz: v.boolean(),
    })
  ),
  async handler(ctx, args) {
    await requireCompanyMember(ctx, args.userId, args.companyId, ["manager", "employee"]);
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    const dateFor = getTodayString();

    const scripts = await ctx.db
      .query("readingScripts")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .collect();

    const result = await Promise.all(
      scripts.map(async (script: any) => {
        if (script.scriptType === "group" && script.targetGroupIds) {
          const userGroups = user.groupIds || [];
          const isInGroup = script.targetGroupIds.some((gId: any) =>
            userGroups.includes(gId)
          );
          if (!isInGroup) return null;
        }

        const readStatus = await ctx.db
          .query("scriptReadStatus")
          .withIndex("by_user_script", (q: any) =>
            q.eq("userId", args.userId).eq("scriptId", script._id)
          )
          .first();

        return {
          _id: script._id,
          title: script.title,
          content: script.content,
          scriptType: script.scriptType,
          isRead: !!readStatus,
          canTakeQuiz: readStatus?.canTakeQuiz || false,
        };
      })
    );

    return result.filter(
      (script): script is {
        _id: any;
        title: string;
        content: string;
        scriptType: string;
        isRead: boolean;
        canTakeQuiz: boolean;
      } => script !== null
    );
  },
});

// Mark script as read
export const markScriptAsRead = mutation({
  args: {
    userId: v.id("users"),
    scriptId: v.id("readingScripts"),
  },
  returns: v.object({
    success: v.boolean(),
    canTakeQuiz: v.boolean(),
  }),
  async handler(ctx, args) {
    const user = await ctx.db.get(args.userId);
    const script = await ctx.db.get(args.scriptId);
    if (!user || !script) throw new Error("Not found");
    await requireCompanyMember(ctx, args.userId, script.companyId, ["manager", "employee"]);

    const existing = await ctx.db
      .query("scriptReadStatus")
      .withIndex("by_user_script", (q: any) =>
        q.eq("userId", args.userId).eq("scriptId", args.scriptId)
      )
      .first();

    if (existing) {
      return { success: true, canTakeQuiz: existing.canTakeQuiz };
    }

    await ctx.db.insert("scriptReadStatus", {
      userId: args.userId,
      scriptId: args.scriptId,
      readAt: Date.now(),
      canTakeQuiz: true,
    });

    return { success: true, canTakeQuiz: true };
  },
});

// Get today's quizzes for a user (with attempt tracking)
export const getTodayQuizzes = query({
  args: {
    userId: v.id("users"),
    companyId: v.id("companies"),
  },
  returns: v.array(
    v.object({
      _id: v.id("dailyQuizzes"),
      title: v.string(),
      description: v.optional(v.string()),
      quizType: v.string(),
      questionCount: v.number(),
      questionsReady: v.boolean(),
      hasScript: v.boolean(),
      scriptRead: v.boolean(),
      scriptId: v.optional(v.id("readingScripts")),
      completed: v.boolean(),
      passed: v.boolean(),
      score: v.optional(v.number()),
      bestScore: v.optional(v.number()),
      attemptCount: v.number(),
      canRetake: v.boolean(),
    })
  ),
  async handler(ctx, args) {
    await requireCompanyMember(ctx, args.userId, args.companyId, ["manager", "employee"]);
    const user = await ctx.db.get(args.userId);
    if (!user) return [];

    const dateFor = getTodayString();

    const quizzes = await ctx.db
      .query("dailyQuizzes")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).eq("dateFor", dateFor)
      )
      .collect();

    const result = await Promise.all(
      quizzes.map(async (quiz: any) => {
        if (quiz.quizType === "group" && quiz.targetGroupIds) {
          const userGroups = user.groupIds || [];
          const isInGroup = quiz.targetGroupIds.some((gId: any) =>
            userGroups.includes(gId)
          );
          if (!isInGroup) return null;
        }

        const [questions, readStatus, attempts] = await Promise.all([
          ctx.db
            .query("dailyQuizQuestions")
            .withIndex("by_quiz", (q: any) => q.eq("quizId", quiz._id))
            .collect(),
          quiz.scriptId
            ? ctx.db
                .query("scriptReadStatus")
                .withIndex("by_user_script", (q: any) =>
                  q.eq("userId", args.userId).eq("scriptId", quiz.scriptId)
                )
                .first()
            : Promise.resolve(null),
          ctx.db
            .query("dailyQuizAttempts")
            .withIndex("by_user_quiz", (q: any) =>
              q.eq("userId", args.userId).eq("quizId", quiz._id)
            )
            .collect(),
        ]);

        const attemptCount = attempts.length;
        const latestAttempt = attempts.length > 0
          ? attempts.sort((a: any, b: any) => b.completedAt - a.completedAt)[0]
          : null;
        const bestScore = attempts.length > 0
          ? Math.max(...attempts.map((a: any) => a.score))
          : undefined;
        // Handle old records that don't have 'passed' field - check score >= 70
        const hasPassed = attempts.some((a: any) => a.passed === true || a.score >= 70);

        // Can retake if they haven't passed yet
        const canRetake = !hasPassed;

        return {
          _id: quiz._id,
          title: quiz.title,
          description: quiz.description,
          quizType: quiz.quizType,
          questionCount: questions.length > 0 ? questions.length : QUESTIONS_PER_QUIZ,
          questionsReady: questions.length > 0 || quiz.questionsReady === true,
          hasScript: !!quiz.scriptId,
          scriptRead: !!readStatus?.canTakeQuiz,
          scriptId: quiz.scriptId,
          completed: attemptCount > 0,
          passed: hasPassed,
          score: latestAttempt?.score,
          bestScore,
          attemptCount,
          canRetake,
        };
      })
    );

    return result.filter(
      (quiz): quiz is {
        _id: any;
        title: string;
        description?: string;
        quizType: string;
        questionCount: number;
        questionsReady: boolean;
        hasScript: boolean;
        scriptRead: boolean;
        scriptId?: any;
        completed: boolean;
        passed: boolean;
        score?: number;
        bestScore?: number;
        attemptCount: number;
        canRetake: boolean;
      } => quiz !== null
    );
  },
});

// Get quiz questions (pre-generated, no waiting)
export const getQuizQuestions = query({
  args: { quizId: v.id("dailyQuizzes"), userId: v.id("users") },
  returns: v.array(
    v.object({
      _id: v.id("dailyQuizQuestions"),
      question: v.string(),
      options: v.array(v.string()),
      order: v.number(),
    })
  ),
  async handler(ctx, args) {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return [];
    await requireCompanyMember(ctx, args.userId, quiz.companyId, ["manager", "employee"]);

    const questions = await ctx.db
      .query("dailyQuizQuestions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();

    return questions
      .sort((a: any, b: any) => a.order - b.order)
      .map((q: any) => ({
        _id: q._id,
        question: q.question,
        options: q.options,
        order: q.order,
      }));
  },
});

// Get the source policy for a quiz (so user can re-read it)
export const getQuizSourcePolicy = query({
  args: { quizId: v.id("dailyQuizzes"), userId: v.id("users") },
  returns: v.object({
    scriptId: v.optional(v.id("readingScripts")),
    scriptTitle: v.optional(v.string()),
    scriptContent: v.optional(v.string()),
    policyTitle: v.optional(v.string()),
  }),
  async handler(ctx, args) {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return { scriptId: undefined, scriptTitle: undefined, scriptContent: undefined, policyTitle: undefined };
    await requireCompanyMember(ctx, args.userId, quiz.companyId, ["manager", "employee"]);

    let scriptTitle: string | undefined;
    let scriptContent: string | undefined;
    let scriptId: any;

    if (quiz.scriptId) {
      const script = await ctx.db.get(quiz.scriptId);
      if (script) {
        scriptId = script._id;
        scriptTitle = script.title;
        scriptContent = script.content;
      }
    }

    let policyTitle: string | undefined;
    if (quiz.sourcePolicyIds && quiz.sourcePolicyIds.length > 0) {
      const policy = await ctx.db.get(quiz.sourcePolicyIds[0]);
      if (policy) {
        policyTitle = policy.title;
      }
    }

    return { scriptId, scriptTitle, scriptContent, policyTitle };
  },
});

// Submit quiz attempt (with retry support and manager notification)
export const submitQuizAttempt = mutation({
  args: {
    userId: v.id("users"),
    quizId: v.id("dailyQuizzes"),
    answers: v.array(
      v.object({
        questionId: v.id("dailyQuizQuestions"),
        selectedAnswer: v.number(),
      })
    ),
  },
  returns: v.object({
    score: v.number(),
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    passed: v.boolean(),
    attemptNumber: v.number(),
    managerNotified: v.boolean(),
    results: v.array(
      v.object({
        questionId: v.id("dailyQuizQuestions"),
        isCorrect: v.boolean(),
        correctAnswer: v.number(),
        explanation: v.optional(v.string()),
      })
    ),
  }),
  async handler(ctx, args) {
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new Error("Quiz not found");
    await requireCompanyMember(ctx, args.userId, quiz.companyId, ["manager", "employee"]);

    const questions = await ctx.db
      .query("dailyQuizQuestions")
      .withIndex("by_quiz", (q: any) => q.eq("quizId", args.quizId))
      .collect();

    let correctAnswers = 0;
    const results: Array<{
      questionId: any;
      isCorrect: boolean;
      correctAnswer: number;
      explanation?: string;
    }> = [];

    for (const answer of args.answers) {
      const question = questions.find((q: any) => q._id === answer.questionId);
      if (question) {
        const isCorrect = question.correctAnswer === answer.selectedAnswer;
        if (isCorrect) correctAnswers++;

        results.push({
          questionId: answer.questionId,
          isCorrect,
          correctAnswer: question.correctAnswer,
          explanation: question.explanation,
        });
      }
    }

    const score = questions.length > 0
      ? Math.round((correctAnswers / questions.length) * 100)
      : 0;
    const passed = score >= PASS_THRESHOLD;

    // Get previous attempts to determine attempt number
    const previousAttempts = await ctx.db
      .query("dailyQuizAttempts")
      .withIndex("by_user_quiz", (q: any) =>
        q.eq("userId", args.userId).eq("quizId", args.quizId)
      )
      .collect();

    const attemptNumber = previousAttempts.length + 1;

    await ctx.db.insert("dailyQuizAttempts", {
      userId: args.userId,
      quizId: args.quizId,
      score,
      totalQuestions: questions.length,
      correctAnswers,
      attemptNumber,
      passed,
      completedAt: Date.now(),
    });

    // Check if we need to notify manager (3rd failed attempt)
    let managerNotified = false;
    // Handle old records without 'passed' field by checking score
    const totalFailedAttempts = previousAttempts.filter((a: any) => a.passed !== true && a.score < 70).length + (passed ? 0 : 1);

    if (!passed && totalFailedAttempts >= MAX_ATTEMPTS_BEFORE_NOTIFY) {
      // Get quiz info for notification
      const quiz = await ctx.db.get(args.quizId);
      const user = await ctx.db.get(args.userId);

      if (quiz && user && user.companyId) {
        // Find the manager for this company
        const company = await ctx.db.get(user.companyId);
        if (company) {
          await ctx.db.insert("managerNotifications", {
            companyId: user.companyId,
            managerId: company.managerId,
            type: "quiz_failure",
            title: "Employee Needs Attention",
            message: `${user.fullName} has failed the quiz "${quiz.title}" ${totalFailedAttempts} times. They may need additional training or support.`,
            employeeId: args.userId,
            employeeName: user.fullName,
            quizId: args.quizId,
            isRead: false,
            createdAt: Date.now(),
          });
          managerNotified = true;
        }
      }
    }

    return {
      score,
      totalQuestions: questions.length,
      correctAnswers,
      passed,
      attemptNumber,
      managerNotified,
      results,
    };
  },
});

// ─── Manager notification queries ────────────────────────────────────
export const getManagerNotifications = query({
  args: {
    managerId: v.id("users"),
  },
  returns: v.array(
    v.object({
      _id: v.id("managerNotifications"),
      type: v.string(),
      title: v.string(),
      message: v.string(),
      employeeName: v.string(),
      isRead: v.boolean(),
      createdAt: v.number(),
    })
  ),
  async handler(ctx, args) {
    const notifications = await ctx.db
      .query("managerNotifications")
      .withIndex("by_manager", (q: any) => q.eq("managerId", args.managerId))
      .order("desc")
      .take(50);

    return notifications.map((n: any) => ({
      _id: n._id,
      type: n.type,
      title: n.title,
      message: n.message,
      employeeName: n.employeeName,
      isRead: n.isRead,
      createdAt: n.createdAt,
    }));
  },
});

export const markNotificationRead = mutation({
  args: {
    notificationId: v.id("managerNotifications"),
  },
  returns: v.null(),
  async handler(ctx, args) {
    await ctx.db.patch(args.notificationId, { isRead: true });
    return null;
  },
});

export const getUnreadNotificationCount = query({
  args: {
    managerId: v.id("users"),
  },
  returns: v.number(),
  async handler(ctx, args) {
    const notifications = await ctx.db
      .query("managerNotifications")
      .withIndex("by_manager", (q: any) => q.eq("managerId", args.managerId))
      .collect();

    return notifications.filter((n: any) => !n.isRead).length;
  },
});

// ─── Internal query: get weekly quiz performance stats ───────────────
export const getCompanyWeeklyQuizStatsInternal = internalQuery({
  args: {
    companyId: v.id("companies"),
  },
  returns: v.object({
    totalEmployees: v.number(),
    completedCount: v.number(),
    passingCount: v.number(),
    failingCount: v.number(),
    notDoingCount: v.number(),
    riskCount: v.number(),
    weeklyQuizCount: v.number(),
    employees: v.array(
      v.object({
        userId: v.id("users"),
        fullName: v.string(),
        email: v.string(),
        status: v.union(
          v.literal("passing"),
          v.literal("failing"),
          v.literal("not_doing")
        ),
        completedCount: v.number(),
        passedCount: v.number(),
        failedCount: v.number(),
        lastAttemptAt: v.optional(v.number()),
        daysSinceLastAttempt: v.optional(v.number()),
      })
    ),
  }),
  async handler(ctx, args) {
    const employees = await ctx.db
      .query("users")
      .withIndex("by_company", (q: any) => q.eq("companyId", args.companyId))
      .collect();

    const companyEmployees = employees.filter((user: any) => user.role === "employee");
    const weekStart = getDateStringDaysAgo(6);
    const today = getTodayString();

    const weeklyQuizzes = await ctx.db
      .query("dailyQuizzes")
      .withIndex("by_date", (q: any) =>
        q.eq("companyId", args.companyId).gte("dateFor", weekStart).lte("dateFor", today)
      )
      .collect();

    let completedCount = 0;
    let passingCount = 0;
    let failingCount = 0;
    let notDoingCount = 0;
    let riskCount = 0;

    const employeeSummaries: Array<{
      userId: any;
      fullName: string;
      email: string;
      status: "passing" | "failing" | "not_doing";
      completedCount: number;
      passedCount: number;
      failedCount: number;
      lastAttemptAt?: number;
      daysSinceLastAttempt?: number;
    }> = [];

    for (const employee of companyEmployees) {
      const attempts = await ctx.db
        .query("dailyQuizAttempts")
        .withIndex("by_user", (q: any) => q.eq("userId", employee._id))
        .collect();

      const weeklyAttempts = attempts.filter((attempt: any) => {
        const quiz = weeklyQuizzes.find((q: any) => q._id === attempt.quizId);
        return !!quiz;
      });

      const passedAttempts = weeklyAttempts.filter((attempt: any) => attempt.passed === true || attempt.score >= PASS_THRESHOLD);
      const failedAttempts = weeklyAttempts.filter((attempt: any) => attempt.passed !== true && attempt.score < PASS_THRESHOLD);
      const latestAttempt = attempts.length > 0
        ? [...attempts].sort((a: any, b: any) => b.completedAt - a.completedAt)[0]
        : null;

      let status: "passing" | "failing" | "not_doing" = "not_doing";
      if (weeklyAttempts.length > 0) {
        completedCount += 1;
        if (failedAttempts.length > 0) {
          failingCount += 1;
          status = "failing";
        } else {
          passingCount += 1;
          status = "passing";
        }
      } else {
        notDoingCount += 1;
        status = "not_doing";
      }

      const daysSinceLastAttempt = latestAttempt ? getDaysSince(latestAttempt.completedAt) : undefined;
      if (daysSinceLastAttempt !== undefined && daysSinceLastAttempt >= 3) {
        riskCount += 1;
      }

      employeeSummaries.push({
        userId: employee._id,
        fullName: employee.fullName,
        email: employee.email,
        status,
        completedCount: weeklyAttempts.length,
        passedCount: passedAttempts.length,
        failedCount: failedAttempts.length,
        lastAttemptAt: latestAttempt?.completedAt,
        daysSinceLastAttempt,
      });
    }

    return {
      totalEmployees: companyEmployees.length,
      completedCount,
      passingCount,
      failingCount,
      notDoingCount,
      riskCount,
      weeklyQuizCount: weeklyQuizzes.length,
      employees: employeeSummaries,
    };
  },
});

// Public query wrapper for manager dashboard
export const getCompanyWeeklyQuizStats = query({
  args: {
    companyId: v.id("companies"),
    userId: v.id("users"),
  },
  returns: v.object({
    totalEmployees: v.number(),
    completedCount: v.number(),
    passingCount: v.number(),
    failingCount: v.number(),
    notDoingCount: v.number(),
    riskCount: v.number(),
    weeklyQuizCount: v.number(),
    employees: v.array(
      v.object({
        userId: v.id("users"),
        fullName: v.string(),
        email: v.string(),
        status: v.union(
          v.literal("passing"),
          v.literal("failing"),
          v.literal("not_doing")
        ),
        completedCount: v.number(),
        passedCount: v.number(),
        failedCount: v.number(),
        lastAttemptAt: v.optional(v.number()),
        daysSinceLastAttempt: v.optional(v.number()),
      })
    ),
  }),
  async handler(ctx, args) {
    await requireCompanyManager(ctx, args.userId, args.companyId);
    return await ctx.runQuery(internal.dailyQuizzes.getCompanyWeeklyQuizStatsInternal, {
      companyId: args.companyId,
    });
  },
});

// ─── Internal mutation: send daily employee reminders ────────────────
export const sendDailyQuizReminders = internalMutation({
  args: {},
  returns: v.null(),
  async handler(ctx) {
    const companies = await ctx.db.query("companies").collect();
    const today = getTodayString();

    for (const company of companies) {
      const employees = await ctx.db
        .query("users")
        .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
        .collect();
      const companyEmployees = employees.filter((user: any) => user.role === "employee");

      for (const employee of companyEmployees) {
        const attempts = await ctx.db
          .query("dailyQuizAttempts")
          .withIndex("by_user", (q: any) => q.eq("userId", employee._id))
          .collect();

        const latestAttempt = attempts.length > 0
          ? [...attempts].sort((a: any, b: any) => b.completedAt - a.completedAt)[0]
          : null;
        const daysSinceLastAttempt = latestAttempt ? getDaysSince(latestAttempt.completedAt) : Number.POSITIVE_INFINITY;

        if (daysSinceLastAttempt < 3) {
          continue;
        }

        const existingNotification = await ctx.db
          .query("quizNotifications")
          .withIndex("by_user_and_date", (q: any) =>
            q.eq("userId", employee._id).eq("dateFor", today)
          )
          .first();

        if (existingNotification) {
          continue;
        }

        await ctx.db.insert("quizNotifications", {
          companyId: company._id,
          userId: employee._id,
          role: "employee",
          type: daysSinceLastAttempt === Number.POSITIVE_INFINITY ? "risk_alert" : "daily_reminder",
          title: daysSinceLastAttempt === Number.POSITIVE_INFINITY ? "Quiz required" : "Quiz reminder",
          message: daysSinceLastAttempt === Number.POSITIVE_INFINITY
            ? "You need to complete your daily quiz. This is your first reminder."
            : `You have not completed a quiz in ${daysSinceLastAttempt} days. Please complete today's quiz to stay on track.`,
          dateFor: today,
          isRead: false,
          createdAt: Date.now(),
        });
      }
    }

    return null;
  },
});

// ─── Internal mutation: send weekly manager summary ─────────────────
export const sendWeeklyManagerQuizSummary = internalMutation({
  args: {},
  returns: v.null(),
  async handler(ctx) {
    const companies = await ctx.db.query("companies").collect();
    const today = getTodayString();

    for (const company of companies) {
      const managers = await ctx.db
        .query("users")
        .withIndex("by_company", (q: any) => q.eq("companyId", company._id))
        .collect();
      const manager = managers.find((user: any) => user.role === "manager");
      if (!manager) {
        continue;
      }

      const stats: any = await ctx.runQuery(internal.dailyQuizzes.getCompanyWeeklyQuizStatsInternal, {
        companyId: company._id,
      });

      const summaryMessage = `Weekly quiz report: ${stats.passingCount} passing, ${stats.failingCount} failing, ${stats.notDoingCount} not doing. ${stats.riskCount} employees are at risk.`;

      await ctx.db.insert("managerNotifications", {
        companyId: company._id,
        managerId: manager._id,
        type: "weekly_summary",
        title: "Weekly quiz performance summary",
        message: summaryMessage,
        employeeId: manager._id,
        employeeName: manager.fullName,
        isRead: false,
        createdAt: Date.now(),
      });

      await ctx.db.insert("quizNotifications", {
        companyId: company._id,
        userId: manager._id,
        role: "manager",
        type: "weekly_summary",
        title: "Weekly quiz performance summary",
        message: summaryMessage,
        dateFor: `${today}-weekly`,
        isRead: false,
        createdAt: Date.now(),
      });
    }

    return null;
  },
});