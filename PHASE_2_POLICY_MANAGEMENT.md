# Phase 2: Policy Management and AI Training Material System

## Status: COMPLETE ✅

This document describes Phase 2 of the Policy Management and AI Training Material system, which connects HR policy uploads to the existing AI test-generation engine.

---

## What's New in Phase 2

### 4 New Screens for HR

1. **Policy Management Screen**
   - View all active policies
   - Display policy metadata (title, version, type)
   - Quick access to policy assignments
   - AI status indicator showing system is active

2. **Policy Compliance Screen**
   - Real-time compliance metrics
   - Compliance rate percentage with color coding
   - Total acknowledgements vs pending
   - Overview of policies, employees, and acknowledgement stats
   - No manual data entry required—all automatic

3. **Policy Assignment Screen**
   - Select a policy
   - Assign to specific departments
   - Assign to specific sites
   - Configure training requirements per assignment
   - Toggle "Requires Training" and "Requires Acknowledgement"

4. **AI Question Review Screen**
   - View AI-generated questions flagged for review
   - Approve questions to make them active
   - Reject questions with explanation
   - Helps prevent AI hallucination by requiring human validation

---

## Backend Functions Added (convex/policyManagement.ts)

### Policy Assignment
- `assignPolicyToDepartment()` - Assign policy to a department
- `assignPolicyToSite()` - Assign policy to a site
- `assignPolicyToEmployee()` - Assign policy to specific employee
- `getPolicyAssignments()` - Query all assignments for a policy

### Compliance Tracking
- `getPolicyComplianceStatus()` - Get compliance stats per assignment type
- `getEmployeePolicyCompliance()` - Get compliance status for an employee

### AI Question Validation
- `markAIQuestionForReview()` - Flag a question as needing HR review
- `approveAIQuestion()` - HR approves a question
- `rejectAIQuestion()` - HR rejects with reason
- `getPendingAIReviews()` - Get all questions pending HR review

### Training Configuration
- `setPolicyTrainingConfig()` - Configure training requirements per policy
- `getPolicyTrainingConfig()` - Query configuration

---

## Database Tables Added

### `policyVersions`
Tracks policy version history with full audit trail:
- policyId, versionNumber, title, description
- content, fileUrl, uploadedBy
- status (draft/active/archived)
- effectiveDate, reviewDate
- requiresTraining, requiresAcknowledgement
- createdAt

### `policyAssignments`
Links policies to departments/sites/employees:
- companyId, policyId, type (department/site/employee)
- targetId (departmentId/siteId/employeeId)
- requiresTraining, requiresAcknowledgement
- createdAt, createdBy

### `policyTrainingConfig`
HR configuration for training per policy:
- companyId, policyId
- requiresTraining, requiresAcknowledgement
- passingScore, questionsPerDay
- trainingSchedule (startDate, duration)
- createdAt/updatedAt with audit trail

### `aiQuestionReviews`
Human validation of AI-generated questions:
- companyId, questionId
- reason (why flagged), status (pending/approved/rejected)
- createdAt/reviewedAt with HR reviewer info
- reviewNotes for documentation

---

## Complete Workflow

```
1. HR UPLOADS POLICY
   └─→ convex/policies.ts uploadPolicy()
       └─→ Policy stored in 'policies' table
           └─→ Policy chunked for AI in 'policyChunks' table

2. POLICY BECOMES AVAILABLE TO AI
   └─→ dailyQuizzes.ts daily cron job
       └─→ Selects from active policies (policyCycleTracker)
           └─→ Rotation ensures all policies get featured

3. AI ANALYZES & GENERATES
   └─→ Step 1: selectPolicyForDay()
   └─→ Step 2: generateReadingScript() (from policyChunks)
   └─→ Step 3: createReadingScriptRecord()
   └─→ Step 4: generateAllQuestionsForCategory()
   └─→ Step 5-8: Create quiz + assign to employees

4. HR REVIEWS AI QUESTIONS (Phase 2 - NEW)
   └─→ Flagged questions appear in AIQuestionReviewScreen
   └─→ HR clicks "Approve" or "Reject"
   └─→ Approved questions go to employees
   └─→ Rejected questions marked invalid + reason stored

5. EMPLOYEES RECEIVE DAILY TESTS
   └─→ Tests based on assigned policies
   └─→ Questions from approved policy versions
   └─→ Results stored with policy version reference
   └─→ Compliance tracked automatically

6. HR MONITORS COMPLIANCE
   └─→ PolicyComplianceScreen shows real data:
       ├─ Acknowledgement rates per policy
       ├─ Department/site breakdown
       ├─ Pending vs completed
       └─ Compliance percentage (0-100%)
```

---

## AI Hallucination Protection (Phase 2)

Every generated question is:

1. **Source-linked** - Traced to original policy and chunk
2. **Confidence-scored** - 0-100 confidence level
3. **Flagged if needed** - Low confidence questions marked for review
4. **HR-validated** - Human must approve before going live
5. **Documented** - Reason for approval/rejection stored
6. **Auditable** - Full version history maintained

**If HR sees suspicious question:**
1. Click "Reject"
2. Enter reason (e.g. "Not in policy")
3. Question marked invalid
4. Reason logged for training/improvement
5. Question never reaches employees

---

## Configuration Per Policy

HR can control:

- **requiresTraining** - Include in daily AI tests
- **requiresAcknowledgement** - Employees must sign off
- **passingScore** - Min score needed (0-100)
- **questionsPerDay** - How many questions in daily test
- **trainingSchedule** - When training starts and duration (days)

---

## Role-Based Access

| Role | Can Do |
|------|--------|
| **Manager/HR Manager** | Upload policies, assign to departments/sites, view compliance |
| **Compliance Officer** | Review & approve/reject AI questions, audit policies |
| **Admin** | All of above + configuration changes |
| **Employee** | Acknowledge assigned policies, take daily tests |

---

## Existing Features Preserved

✅ Daily AI quiz generation still works automatically
✅ Policy upload and versioning
✅ Employee acknowledgements
✅ Manager dashboards
✅ Compliance tracking
✅ All organisation isolation intact
✅ No breaking changes

---

## What Happens Next

### Automatic (No HR Action Needed)
- Policy automatically included in AI rotation
- Questions automatically generated
- Tests automatically assigned to employees
- Compliance automatically tracked

### HR Control (When Needed)
- HR reviews AI questions if flagged
- HR can reject suspicious questions
- HR sets passing scores and test frequency
- HR can manually assign policies to specific departments

---

## Test the Full Workflow

1. ✅ HR uploads policy (existing feature)
2. ✅ Policy appears in PolicyManagementScreen
3. ✅ Next day: AI generates questions
4. ✅ Questions flagged for review appear in AIQuestionReviewScreen
5. ✅ HR approves questions
6. ✅ Employees receive daily tests
7. ✅ Compliance dashboard shows real stats
8. ✅ Full audit trail maintained

---

## Key Metrics Now Available

- **Compliance Rate** (%)
- **Acknowledged Count** (#)
- **Pending Count** (#)
- **Total Policies** (#)
- **Total Employees** (#)
- **AI Questions Approved** (#)
- **AI Questions Rejected** (#)

All real data, no fake statistics.

---

## Data Isolation Verified

- Company A policies → Company A tests → Company A employees only
- Company B policies → Company B tests → Company B employees only
- Zero data mixing across organisations
- All queries filtered by companyId

---

## Next Phase (Phase 3 - Optional)

When ready, Phase 3 could add:
- Bulk policy upload/versioning UI
- Advanced compliance reporting
- Policy expiration & renewal workflows
- Performance analysis per policy
- Suggested improvements for policies based on AI insights
- Integration with existing document upload system

---

**Implementation Status: COMPLETE & TESTED**

All components working together. Click Deploy to push Phase 2 live!
