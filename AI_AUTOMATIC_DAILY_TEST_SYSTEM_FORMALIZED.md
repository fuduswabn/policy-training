# Formalized AI Automatic Daily Test Generation System

## Status: IMPROVED & FORMALIZED ✅

This document describes the **complete automated workflow** for AI-generated daily training tests - the core of your Policy Training App.

---

## 🎯 Core Principle

**ZERO manual quiz creation required.**  
The system automatically generates, delivers, marks, and analyses training tests based on company-approved policies. HR intervenes only when necessary.

---

## 📊 Complete Workflow

### Step 1: Policy Upload (HR Action)
```
HR uploads policy document
      ↓
System chunks content for AI
      ↓
Policy marked "Active"
      ↓
[AUTOMATION BEGINS]
```

### Step 2: Daily Content Generation (Automated Nightly)
```
Cron: generateAllDailyContent() runs at scheduled time
      ↓
For each company:
  - Check if content already generated for today
  - Pick next policy in rotation (policyCycleTracker)
  - Generate policy rotation for departments/sites
```

### Step 3: Generate Reading Material (AI + LLM)
```
Policy selected
      ↓
AI generates 800+ word study material using LLM
  - Includes key facts, procedures, numbers
  - Organized with headers and examples
  - Specific to daily focus area (Mon=Understanding, Tue=Application, etc.)
      ↓
Material saved in readingScripts table
      ↓
Employees can read before taking quiz
```

### Step 4: Pre-Generate Quiz Questions (AI + LLM)
```
5 Category-based questions generated:
  1. Understanding - SPECIFIC facts from policy
  2. Application - Workplace scenario (what would you do?)
  3. Reporting - Procedures, escalation, timelines
  4. Responsibility - Who is responsible for what?
  5. Consequences - What happens if you don't comply?

Generation process:
  - Consult 7-day question history (avoid repetition)
  - Consult policy rotation (fair coverage)
  - Use LLM to generate from source material ONLY
  - Fallback to templates if LLM fails
  - Save before employees see
  - Confidence score attached to each question
```

### Step 5: Daily Test Delivered (Employee Experience)
```
Employee logs in
      ↓
"My Daily Test" screen shows:
  - Policy name (Health & Safety)
  - 5 questions waiting
  - Due: Today
  - [Read Material] [Take Test] buttons
      ↓
Employee reads material (optional, can retry)
      ↓
Employee takes test (cannot see correct answers until submit)
      ↓
Employee submits
```

### Step 6: Automatic Marking
```
System calculates:
  - Correct answers: X/5
  - Percentage: XX%
  - Pass/Fail (default 70% threshold)
  - Score recorded
  - Results stored with policy version reference
```

### Step 7: Performance Analysis & Adaptation
```
System analyses:
  - Employee's weak topics (category-based)
  - Trending (improving or declining?)
  - Risk flags (3+ failures, 3+ days inactive)
  - Days since last attempt
```

### Step 8: Notifications & Escalation
```
Employee notifications:
  - Daily reminder if they haven't tested (first reminder)
  - Risk alert if inactive 3+ days
  
Manager notifications:
  - Employee failed 3x on same quiz
  - Weekly summary: Pass rate, at-risk employees
  - Alert if employee hasn't tested in 3 days
```

### Step 9: HR Dashboard Visibility
```
HR sees in real-time:
  - Today's tests generated count
  - Employees who completed: ✅
  - Employees who failed: ⚠️
  - Employees who haven't tested: ❌
  - Policy rotation status
  - AI generation history & logs
  - Average pass rate
```

---

## 🔧 Improvements Implemented

### 1. Adaptive Testing (Difficulty)
**Problem:** All employees got same difficulty questions
**Solution:** System adapts based on recent performance

```
If avg score 80%+ → Hard questions
If avg score 60-80% → Medium questions  
If avg score <60% → Easy questions
```

**How it works:**
- `calculateAdaptiveDifficulty()` checks last 7 days
- Each question tagged with difficulty level
- Employee gets appropriate challenge level

---

### 2. Weak Topic Identification
**Problem:** HR didn't know which topics employees struggled with
**Solution:** Auto-identify and recommend focus areas

```
System tracks by category:
  - Understanding
  - Application
  - Reporting
  - Responsibility
  - Consequences

For each: Calculate failure rate
Flag as "weak area" if >30% failure rate
```

**Employee sees:**
- "Focus on Reporting - you've answered incorrectly 3 times"
- Future tests include MORE questions on weak topics

---

### 3. Source Traceability (AI Hallucination Protection)
**Problem:** AI could invent company policies
**Solution:** Every question linked to source material

```
Each question has:
- Policy ID (which policy it came from)
- Policy version (immutable for audit)
- Source content (exact text used)
- Confidence score (0-100)

Example:
Question: "What is maximum room temperature?"
Source: "Safety Policy v2.0, Section 4: 'Maintain room temperature between 18-24°C'"
Confidence: 95
```

**Protection:**
- If confidence <70: Flag "requires review"
- HR can validate before employees see it
- All questions linked to approved material

---

### 4. HR Configuration & Control
**Problem:** HR had no control over test schedule/difficulty
**Solution:** `configureAITesting()` mutation + `testGenerationConfig` table

```
HR can configure:
  - Questions per test (default 5)
  - Passing score (default 70%)
  - Scheduled time (8:00 AM?)
  - Training schedule (daily/weekday/weekly)
  - Enable/disable on demand
```

**How to use:**
```typescript
await configureAITesting({
  companyId: "company123",
  questionsPerDay: 5,
  passingScore: 75,
  scheduledTime: 8, // 8 AM
  trainingSchedule: "daily"
})
```

---

### 5. HR Override Controls
**New capabilities:**

- **Pause:** `enabled: false` stops generation
- **Resume:** `enabled: true` resumes automatically
- **Change difficulty:** `calculateAdaptiveDifficulty()` called on next quiz
- **Question validation:** HR can approve/reject questions before employees see

---

### 6. AI Generation Logging & Audit Trail
**Problem:** No record of what was generated and why
**Solution:** `aiGenerationLog` table tracks everything

```
Each generation logged:
- Date/time
- Policy used
- Policy version
- Questions generated: 5
- Questions successful: 4
- Questions failed: 1 (fell back to template)
- Generation method: "llm" or "fallback"
- Average confidence: 87
- Notes: "Policy contains vague requirements in Section 3"
```

**HR Dashboard shows:**
- Last 30 generations
- Success rate per policy
- Failure patterns
- Fallback frequency

---

### 7. Employee Performance Analytics
**Problem:** HR couldn't see performance trends
**Solution:** `getEmployeePerformanceAnalytics()` query

```
Returns for each employee:
- Overall score (average)
- Total attempts
- Passed vs failed
- Pass rate %
- Weekly average
- Trending up/down
- Weak areas (categories)
- Last attempt date
- Days inactive
```

---

## 📋 Complete Database Schema

### New Tables Added

```
testGenerationConfig
  - companyId
  - enabled (boolean)
  - questionsPerDay
  - passingScore
  - scheduledTime (0-23)
  - trainingSchedule

aiGenerationLog
  - companyId
  - policyId
  - policyVersionId
  - quizId
  - questionsGenerated
  - questionsSuccessful
  - questionsFailed
  - generationMethod ("llm" | "fallback")
  - averageConfidence (0-100)
  - generatedAt (timestamp)
```

### Updated Tables

```
dailyQuizQuestions
  + difficulty ("easy" | "medium" | "hard")
  + sourceContent (exact text used)
  + confidence (0-100)
  + requiresValidation (boolean)
  + validatedBy (user ID)
  + validatedAt (timestamp)
  + approved (boolean)
  + validationNotes (string)
```

---

## 🚀 The 8-Step Automated Pipeline

### 1. **Detect** (`ensureTodayContent`)
- Check if today's content exists
- If not, trigger generation

### 2. **Pick** (`pickNextPolicy`)
- Get list of active policies
- Use `policyCycleTracker` for fair rotation
- Select next policy to use

### 3. **Generate Reading** (`generateReadingMaterial`)
- Call LLM API with policy + daily focus
- Create 800+ word study material
- Save to `readingScripts` table

### 4. **Create Quiz** (`saveDailyQuizShell`)
- Create empty quiz for today
- Link to policy + reading material
- Mark `questionsReady: false`

### 5. **Generate Questions** (`generateQuestionsWithLLM`)
- Consult 7-day question history
- Generate 5 category questions from policy
- Add difficulty rating + confidence score
- Fallback to templates if needed

### 6. **Save Questions** (`saveFreshQuizQuestions`)
- Save all questions to DB
- Each question linked to source policy
- Mark quiz as `questionsReady: true`

### 7. **Log Generation** (`logAIGeneration`)
- Record what was generated
- Success rate, method, confidence
- Add to audit trail

### 8. **Notify Employees** (`sendDailyQuizReminders`)
- Send notifications for daily tests
- Alert managers of failures/inactivity
- Weekly summary to managers

---

## 🎓 Question Generation Details

### The 5 Categories (Daily Rotation)

**Monday: Understanding**
- "According to the policy, what is [specific fact]?"
- Tests comprehension of key points

**Tuesday: Application**
- "You're in this situation... what should you do?"
- Tests ability to apply policy to real scenarios

**Wednesday: Reporting**
- "When must this be reported? To whom? By when?"
- Tests knowledge of procedures

**Thursday: Responsibility**
- "Who is responsible for [action]?"
- Tests understanding of roles

**Friday: Consequences**
- "What happens if this rule isn't followed?"
- Tests awareness of importance

### Question Generation Logic

```
For each category:
  1. Get last 7 days of questions for this company
  2. Ensure we're not repeating
  3. Pick a policy section from `policyChunks`
  4. Ask LLM: "Generate a [category] question about [section]"
  5. Check confidence score (returned by LLM)
  6. If confidence < 70: Flag for HR review
  7. If LLM fails: Use fallback template
```

---

## 📊 HR Dashboard Metrics

### Real-Time Dashboard Shows

```
Today's Tests
  - Generated: 3 (general + 2 groups)
  - Employees with test available: 145
  - Completed today: 78 (54%)
  - Passed: 72 (92%)
  - Failed: 6 (8%)
  - Not yet attempted: 67

This Week
  - Average pass rate: 89%
  - Tests generated: 15
  - Questions generated: 75
  - AI success rate: 93%
  - At-risk employees: 4
  
AI Generation Logs
  - Policy: Health & Safety (v2.0)
  - Time: 06:00 AM
  - Questions: 5 generated, 5 successful
  - Method: LLM
  - Confidence: 92%
  
Employee Performance
  - [Name] - Score: 85%, Weak: Reporting
  - [Name] - Score: 62%, Weak: Application, Consequences
  - [Name] - Score: 78%, Trending: ↑
```

---

## 🔐 Data Integrity & Audit Trail

### Every Test is Traceable

```
Employee takes test
      ↓
Answers recorded in dailyQuizAttempts
      ↓
Linked to quiz ID + question IDs
      ↓
Questions linked to policyVersions
      ↓
Generation logged in aiGenerationLog
      ↓
Complete audit trail from policy → test → result
```

### Historical Data Preservation

```
When HR publishes Policy v2.0:
  - Old v1.0 remains in policyVersions
  - All employee results tagged with version used
  - Future tests use v2.0
  - Reports can be run by version
```

---

## 🛡️ Failsafes & Guarantees

### No Test Generation Breaks

1. **Cron fails?** → `ensureTodayContent` checks on next login
2. **LLM API down?** → Fallback to template questions
3. **Policy missing?** → Skip that day, use different policy
4. **Question generation hangs?** → Timeout after 30s, fallback
5. **Database error?** → Questions already saved before cleanup
6. **Network issue?** → Retry with exponential backoff

### Employee Always Gets Test

- Pre-generated before employee sees it
- If questions missing: Employee sees loading state
- If LLM fails: Fallback questions are safe
- If confidence low: HR validates before use

---

## 📈 Continuous Improvement

### System Learns Over Time

```
Day 1: Questions generated at random difficulty
      ↓
Week 1: System tracks performance by difficulty
      ↓
Week 2: Adaptive difficulty kicks in
      ↓
Month 1: Weak topics identified, extra questions generated
      ↓
Month 2: AI learns which question types work best
      ↓
Ongoing: HR reviews logs, provides feedback
```

---

## 🎯 Success Metrics

**For Employees:**
- Can complete test in 5-10 minutes
- See immediate results + feedback
- Know what topics to focus on

**For HR:**
- Complain zero quizzes
- See employee compliance automatically
- Identify at-risk employees instantly
- Review generation logs for quality assurance

**For Company:**
- Measurable compliance
- Automatic training delivery
- Reduced HR manual workload (80%+ automation)
- Audit trail for legal compliance

---

## ⚙️ Technical Stack

- **Daily generation:** Cron job + Convex mutations
- **Question generation:** a0 LLM API (with fallback templates)
- **Data storage:** Convex database
- **Performance tracking:** Indexing on userId, companyId, dateFor
- **Audit trail:** aiGenerationLog table
- **HR controls:** testGenerationConfig table

---

## 🚀 Next Steps (Optional Future Phases)

- Machine learning to improve question quality over time
- Predictive analytics (who will fail next?)
- Automated remedial training assignments
- Integration with external training platforms
- Custom question templates per company
- Multi-language question generation
- Gamification (leaderboards, badges)

---

## ✅ Testing Checklist

After deployment, verify:

1. ✅ Existing AI test generation still works
2. ✅ Employees can take daily tests
3. ✅ Tests are marked automatically
4. ✅ Results stored with policy version
5. ✅ Manager notifications sent on failures
6. ✅ HR dashboard shows real data
7. ✅ Question history prevents repetition
8. ✅ Adaptive difficulty works
9. ✅ Weak topics identified correctly
10. ✅ AI generation logs are complete
11. ✅ HR can configure settings
12. ✅ Fallback questions work if LLM fails
13. ✅ Company data is isolated
14. ✅ No existing features broken

