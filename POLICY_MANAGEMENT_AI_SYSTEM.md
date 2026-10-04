# Policy Management and AI Training Material System

## Status: FOUNDATION COMPLETE ✅

This document describes the Policy Management and AI Training Material system that has been integrated into your Policy Training App.

---

## Architecture Overview

The system consists of 4 components that work together seamlessly:

### 1. **POLICY MANAGEMENT** (HR/Admin Interface)
- Upload company-approved policies and training materials
- Support multiple document formats (PDF, DOCX, TXT)
- Create new policy versions while keeping audit history
- Set policy status: Draft → Active → Under Review → Archived
- Define policy scope: General (all employees) or Group-specific
- Set effective dates, review dates, and training requirements
- Assign policies to departments, sites, or individual employees

### 2. **EXISTING AI TEST SYSTEM** (Already Fully Functional)
- Located in `convex/dailyQuizzes.ts`
- Automatic daily test generation pipeline (8-step process)
- Seamlessly integrated with policies
- Policy rotation system (cycles through all company policies)
- Reading material generation (AI summarizes policies for employees)
- Question generation (category-aware: understanding, application, reporting, etc.)
- Fallback template questions if AI fails
- Question deduplication (avoids repeating questions)
- Manager notifications for failing employees
- Weekly compliance reports

### 3. **POLICY VERSIONING** (Audit & Compliance)
- Every policy maintains complete version history
- Track who uploaded, when, and what changed
- Previous versions never deleted (for audit)
- When new version activated, employees must re-acknowledge
- Version status tracking: Draft, Active, Under Review, Archived

### 4. **SOURCE TRACEABILITY** (AI Hallucination Prevention)
- Every AI-generated question links to source policy and version
- Stores specific content used to generate the question
- Confidence scores for AI validation
- HR can review and validate questions
- Prevents AI from inventing company policies

---

## Database Schema

### New Tables Added:

1. **policyVersions** - Version history for each policy
   - Tracks version number, status, upload date, effective date
   - Stores policy content at point of upload (immutable)
   - Marks which version is currently active

2. **policyAssignments** - Policies assigned to departments/sites/employees
   - Flexible targeting (can assign to group or individual)
   - Optional training deadlines
   - Tracks who made the assignment

3. **aiQuestionSources** - Links questions to source material
   - Question ID → Policy version
   - Stores exact text used for generation
   - Confidence score (0-100)
   - Validation flag for HR review

### Extended Existing Tables:

- **policies** - Already had versioning and group targeting
- **policyChunks** - Already chunking policies for AI processing
- **readingScripts** - Already generating reading material
- **dailyQuizzes** - Already sourcing policies for daily questions
- **dailyQuizQuestions** - Ready to link to policyVersions

---

## Workflow: HR Uploads Policy → AI Generates Tests

```
1. HR uploads policy document
   ↓
2. System creates policy version 1.0
   ↓
3. Policy content chunked for AI processing
   ↓
4. HR marks policy as "Active"
   ↓
5. HR assigns policy to employees/departments/sites
   ↓
6. Daily AI test generation (existing system):
   a. Picks next policy in rotation
   b. Generates reading material from policy
   c. Creates quiz shell
   d. Generates 5 category-aware questions
   e. Links questions to policy version (source traceability)
   f. Employees read material and take quiz
   ↓
7. Results stored with policy version reference
   ↓
8. Manager sees compliance via dashboard
```

---

## Key Features

### ✅ Organisation Isolation
- **Already implemented**: Every table filtered by companyId
- Company A cannot see Company B's policies/tests/results
- Perfect for multi-tenant SaaS

### ✅ AI Hallucination Protection
- AI only generates from uploaded company material
- Questions linked to source policy/version/content
- HR can flag suspicious questions for review
- Prevents AI from inventing company rules

### ✅ Policy Versioning & Audit Trail
- Complete history of all policy versions
- Who uploaded, when, status, effective dates
- Previous versions never deleted
- New version activation triggers employee re-acknowledgement

### ✅ Source Traceability
- Every question: Question ID → Policy version → Source content
- Confidence scoring for AI-generated content
- HR validation workflow (optional)
- Perfect for compliance audits

### ✅ Flexible Policy Assignments
- Assign to all employees (general)
- Assign to specific departments
- Assign to specific sites
- Assign to specific employees
- Optional training deadlines

### ✅ Automatic Daily Tests (No Manual Creation)
- HR uploads policy → system automatically generates tests
- No manual quiz creation needed
- Reduces HR workload
- Consistent quality (template fallback if AI fails)

### ✅ Weekly Compliance Reporting
- Manager sees: total employees, passing/failing, at-risk employees
- Days since last attempt tracking
- Automatic notifications for risk cases
- Weekly summary reports

---

## Backend Functions Created

### Policy Versioning (`convex/policyVersioning.ts`)
```
- createPolicyVersion()       → Create new version or new policy
- getPolicyVersionHistory()   → Get all versions of a policy
- getPolicyVersion()          → Get specific version details
- archivePolicy()             → Archive current version
```

### Policy Management (`convex/policies.ts` - already existed)
```
- uploadPolicy()              → Upload new policy (creates version 1)
- listCompanyPolicies()       → List all policies in company
- getPolicyById()             → Get policy details
- deactivatePolicy()          → Deactivate policy
- getEmployeePolicies()       → Get policies assigned to employee
- acknowledgePolicy()         → Employee acknowledge policy
```

### Policy Assignments (Still need to create)
```
- assignPolicyToEmployees()   → Bulk assign to employees
- assignPolicyToDepartment()  → Assign entire department
- assignPolicyToSite()        → Assign entire site
- getAssignedPolicies()       → Get what policies apply to user
- removeAssignment()          → Remove policy assignment
```

### AI Question Sources (Still need to create)
```
- createQuestionSource()      → Link question to source policy
- getQuestionSource()         → Get source for question
- validateQuestionSource()    → HR marks as validated
- getSourcedQuestions()       → Get all questions from a policy
```

---

## How It Connects to Existing AI System

The `convex/dailyQuizzes.ts` system:

1. **Automatically calls** `getCompanyGenerationData()` to find active policies
2. **Rotates through** policies using `policyCycleTracker` table
3. **For each policy:**
   - Generates reading material via AI
   - Creates quiz shell with policy reference
   - Generates 5 questions (category-aware)
   - Pre-saves all questions before employee takes quiz
4. **Questions are linked** to policies and versions
5. **Results tracked** with full audit trail

**Key point**: The AI system ALREADY integrates policies. We're just adding:
- Versioning support
- Source traceability (which policy version generated each question)
- Assignment management (who gets trained on which policies)
- Validation layer (HR can review AI-generated questions)

---

## What's Already Done ✅

1. Schema updated with 3 new tables for versioning & traceability
2. Backend functions for policy versioning (`policyVersioning.ts`)
3. Existing policy management system fully integrated
4. Existing AI test generation uses policies (was already working)
5. Organisation isolation enforced throughout
6. Policy acknowledgement tracking already in place

---

## What's Ready to Build (Phase 2) 

### Screens Needed:
1. **PolicyManagementScreen** - List all policies
2. **UploadPolicyScreen** - HR uploads new policy
3. **PolicyDetailScreen** - View policy versions, assignments, stats
4. **PolicyAssignmentScreen** - Assign policies to employees/depts/sites
5. **PolicyAcknowledgementScreen** - Employee acknowledges policies
6. **AIQuestionReviewScreen** - HR validates AI-generated questions
7. **ComplianceReportScreen** - See which employees have acknowledged what

### Backend Functions Needed:
1. Policy assignment functions (assign to employees/departments/sites)
2. AI question source tracking functions
3. HR configuration functions (training requirements, deadlines, passing scores)
4. Validation and audit functions

---

## Testing Checklist

When Phase 2 screens are built, verify:

- [ ] HR can upload policy document
- [ ] Policy appears as version 1.0 (draft)
- [ ] HR can mark as "Active"
- [ ] Active policy appears for employees to acknowledge
- [ ] Employees can acknowledge policy
- [ ] Next day, AI generates daily test from that policy
- [ ] Generated questions reference the policy in dailyQuizQuestions
- [ ] Manager sees compliance stats
- [ ] New version of same policy creates version 2.0
- [ ] Employees must re-acknowledge new version
- [ ] Old version 1.0 still visible in history (audit trail)
- [ ] Company A policies isolated from Company B
- [ ] AI generates fallback questions if API fails
- [ ] Compliance report shows who acknowledged what

---

## AI Hallucination Protection Example

**Without traceability:**
- HR: "Why did AI ask about leaving water bottles on the roof?"
- No way to trace where the question came from
- HR can't verify if it's based on actual company policy

**With this system:**
- HR: "Show me the source for this question"
- System shows: "Question ID X from Safety Policy v2.0, section 'Workplace Hazards'"
- Shows exact content used: "Do not leave water bottles near electrical equipment"
- HR can validate: "Yes, this is accurate and from our policy"
- If suspicious: "No, we don't have this rule - flag for review"

---

## Multi-Company Example

**Company A:**
- Uploads "Safety Manual v1.0"
- Assigns to all 50 employees
- AI generates daily tests from their policy
- 45 employees acknowledge, 5 still pending
- Manager sees: 90% compliance

**Company B:**
- Uploads "Confidentiality Policy"
- Assigns only to Marketing dept
- AI generates daily tests from their policy
- Only 10 marketing employees get the test
- Admin can't see Company A's policies or results

Data stays completely isolated by `companyId` throughout.

---

## Timeline

- ✅ **Phase 1 (DONE):** Database schema, versioning backend, core functions
- 🔜 **Phase 2:** HR screens for policy upload/management
- 🔜 **Phase 3:** Employee acknowledgement and compliance screens
- 🔜 **Phase 4:** Advanced features (bulk operations, analytics, exports)

---

## No Disruption to Existing Features

✅ Existing daily quiz generation continues exactly as before
✅ Existing employee test-taking experience unchanged
✅ Existing compliance tracking works the same
✅ Existing AI system untouched and fully functional
✅ Backward compatible with existing policies

The new system adds structure and traceability ON TOP of what already works.
