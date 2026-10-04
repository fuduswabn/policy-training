# Package Configuration & Feature Breakdown

## Overview
This document outlines how packages are structured, which features are included in each tier, and how user packages sync with in-app purchases.

---

## Package Tiers

### 1. **Starter** - $16/month
**Target**: Small teams getting started
- **Employee Limit**: 10 employees
- **Groups**: Up to 3 groups
- **Features**:
  - Daily auto-generated quizzes ✓
  - AI content moderation ✓
  - Personal learning plans ✓
  - Email support ✓
  - **Not Included**: Wellness chat, Conflict resolution, Analytics

### 2. **Pro** - $37/month
**Target**: Growing businesses with wellness support
- **Employee Limit**: 50 employees
- **Groups**: Up to 10 groups
- **Features**:
  - Daily auto-generated quizzes ✓
  - AI content moderation ✓
  - Personal learning plans ✓
  - AI-powered wellness support chat ✓
  - AI-powered conflict resolution ✓
  - Priority email & phone support ✓
  - Advanced analytics ✓

### 3. **Enterprise** - $130/month
**Target**: Large organizations with full suite
- **Employee Limit**: 200 employees
- **Groups**: Up to 50 groups
- **Features**:
  - All Pro features ✓
  - Advanced analytics & reporting ✓
  - Custom branding ✓
  - Dedicated account manager (available)

---

## Personal Learning Feature (Available to ALL Packages)

The personal learning feature is available to all subscription tiers:
- Employees can request custom learning plans
- AI generates personalized curriculum
- Multi-day learning schedules with daily lessons
- Auto-generated quizzes for knowledge verification
- Progress tracking per employee

### What Learning Includes:
- Skill request creation
- Curriculum generation based on experience level
- Modular lesson structure
- Knowledge checks after each lesson
- Daily progress tracking
- Quiz attempts and scoring

---

## White-Label Reseller Packages

### Reseller Starter - Free (Trial: 30 days)
- 1 white-labeled company
- Unlimited employees
- Personal learning plans ✓
- Email support

### Reseller Professional - Free (Trial: 30 days)
- 5 white-labeled companies
- Unlimited employees per company
- Personal learning plans ✓
- REST API access
- Priority email & phone support

### Reseller Enterprise - Free (Trial: 30 days)
- Unlimited white-labeled companies
- Unlimited employees
- Personal learning plans ✓
- Full REST API + Webhooks
- 24/7 support + Dedicated account manager

---

## Company Package Storage

Packages are stored in the `companies` table with the following fields:
```
planRef: "starter" | "pro" | "enterprise"
subscriptionStatus: "active" | "trial" | "expired" | "cancelled"
scheduledPlanRef: optional next plan (for downgrades)
trialEndsAt: timestamp
lastPaymentDate: when subscription was activated
paymentDueDate: next billing date
```

---

## Package Sync on Purchase

### When a user purchases a package:

1. **iOS/Stripe Purchase** → `a0-purchases` library detects
2. **App calls** `setCompanyPlanFromPurchase()` mutation
3. **Mutation updates** `companies.planRef` and `subscriptionStatus`
4. **Learning becomes available** immediately
5. **Employee limits enforced** based on new plan
6. **Features enabled/disabled** via plan checks

### Function: `setCompanyPlanFromPurchase`
Located in: `convex/users.ts`

```typescript
export const setCompanyPlanFromPurchase = mutation({
  args: {
    companyId: v.id("companies"),
    planRef: v.union(v.literal("starter"), v.literal("pro"), v.literal("enterprise")),
    paymentId: v.string(),
  },
  handler: async (ctx, args) => {
    // Updates company plan
    // Sets subscriptionStatus to "active"
    // Records payment date
    // Package history is tracked
  }
})
```

---

## Feature Gates by Package

### Learning Features (ALL packages)
- ✓ Create learning requests
- ✓ Generate curriculum
- ✓ Take daily lessons
- ✓ Complete quizzes

### Wellness Chat (Pro & Enterprise only)
- ✓ AI-powered support conversations
- ✓ Counselor/psychologist referrals
- ✗ Not available in Starter

### Conflict Resolution (Pro & Enterprise only)
- ✓ Create conflict cases
- ✓ AI mediation & judgment
- ✓ Evidence management
- ✗ Not available in Starter

### Advanced Analytics (Pro & Enterprise only)
- ✓ Detailed compliance reporting
- ✓ Trend analysis
- ✓ Custom dashboards
- ✗ Not available in Starter

### Custom Branding (Enterprise only)
- ✓ Logo uploads
- ✓ Color customization
- ✓ Domain configuration
- ✗ Not available in Starter/Pro

---

## Terms & Conditions Management

The system now includes version-controlled T&C with four types:

1. **terms** - Service terms
2. **privacy** - Privacy policy
3. **acceptable_use** - Usage guidelines
4. **data_protection** - Data handling

### T&C Features:
- Version tracking (v1, v2, v3, etc.)
- User acknowledgment records (audit trail)
- IP address & device tracking
- Historical version viewing
- Effective date scheduling

### Functions Available:
- `createTermsVersion()` - Admin creates new T&C version
- `getActiveTerms()` - Fetch current version
- `acknowledgeTerms()` - User acknowledges
- `hasUserAcknowledgedTerms()` - Check compliance
- `getUserTermsHistory()` - View user's acknowledgments

---

## Company Isolation

**All data is properly company-scoped:**

✓ Templates - scoped by `companyId`
✓ Policies - scoped by `companyId`
✓ Quizzes - scoped by `companyId`
✓ Inspections - scoped by `companyId`
✓ Learning requests - scoped by `companyId`
✓ Employees - scoped by `companyId`

**Templates cannot be shared across companies.** Each company maintains its own inspection templates, policies, and learning content.

---

## Deployment Checklist

- [x] Schema updated with termsConditions tables
- [x] Monetization.yaml updated with personal_learning entitlements
- [x] Convex functions deployed (termsConditions.ts)
- [x] Terms & Conditions screen created
- [x] Company isolation verified for templates
- [x] Package sync functions available (existing)

---

## Next Steps

1. **Deploy code** - Click Deploy in IDE (OTA update)
2. **Test package purchase** - Use a test account to verify sync
3. **Add sample T&C** - Use admin tools to create initial terms versions
4. **Test learning** - Verify learning works across all package tiers

---

## Admin Panel Actions

To manage packages and T&C as an admin:

1. Navigate to Package Management screen
2. View current company plan and usage
3. Upgrade/downgrade packages (scheduled or immediate)
4. View package history and notifications

To manage T&C:

1. Create new T&C versions via admin panel
2. Set effective dates
3. View all versions and user acknowledgments
4. Track compliance with audit trail

