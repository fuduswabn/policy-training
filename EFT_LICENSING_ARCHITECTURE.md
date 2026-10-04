# EFT APK Licensing Flow with Seat Limits - Architecture Summary

## Current System Overview

### Authentication Flow
- **Location**: `lib/auth-context.tsx`, `convex/users.ts`
- **Auth Context**: React Context-based auth with AsyncStorage persistence
- **User Roles**: admin, manager, employee, hr_manager, hr_officer, compliance_officer
- **Company Association**: Users linked to companies via `companyId`
- **Session**: User data stored in AsyncStorage with userId, email, fullName, role, companyId

### Database Schema (Convex)
**Key Tables**:
- `users`: Email, password (hashed), fullName, role, companyId, groupIds
- `companies`: name, managerId, planRef, subscriptionStatus, employeeCount, paymentDueDate, trialEndsAt
- `eftPayments`: companyId, userId, packagePlan, amount, currency, paymentReference, status, proofOfPaymentUrl, expiresAt
- `packages`: name, maxEmployees, maxGroups, priceMonthly, features, isActive

---

## Current Paywall & Payment System

### 1. Paywall Screen (`screens/PaywallScreen.tsx`)
- **Purpose**: Display subscription packages to users
- **Integration**: RevenueCat for Google Play billing (Android only)
- **Features**:
  - Fetches offerings from RevenueCat
  - Displays package cards with pricing
  - "Restore Purchases" button
  - **EFT Payment Button**: Routes to `EFTPaymentScreen`

### 2. EFT Payment Flow (`screens/EFTPaymentScreen.tsx` + `convex/eft.ts`)

#### Frontend (EFTPaymentScreen.tsx)
- Shows package selection UI
- Displays banking details (hardcoded in backend)
- WhatsApp integration for payment notification
- Proof of payment upload capability

#### Backend (convex/eft.ts)
**Key Functions**:

1. **initiateEFTPayment()**
   - Input: companyId, userId, packagePlan (starter|pro|enterprise)
   - Generates unique payment reference (EFT-{timestamp}-{random})
   - Creates `eftPayments` record with status="pending"
   - Returns: paymentReference, amount, bankingDetails, whatsappLink
   - **Reference Expiry**: Currently set to 2099 (non-expiring)

2. **uploadEFTProofOfPayment()**
   - Input: paymentId, proofOfPaymentUrl (Convex storage URL)
   - Updates payment status to "verified" immediately upon upload
   - No admin verification required currently

3. **verifyEFTPayment()** (Admin function)
   - Input: paymentId, verified (boolean), notes
   - If verified=true:
     - Updates payment status to "verified"
     - Activates company subscription with planRef
     - Sets paymentDueDate = now + 30 days
     - Creates manager notification
   - If verified=false:
     - Updates payment status to "failed"
     - Creates rejection notification

4. **getPendingEFTPayments()** (Admin query)
   - Returns all payments with status="pending"
   - Includes company name, user email, proof URL

### 3. Package Management (`convex/packages.ts`)

**Package Tiers** (with seat limits):
```
Starter:   maxEmployees=10,  maxGroups=3
Pro:       maxEmployees=50,  maxGroups=10
Enterprise: maxEmployees=200, maxGroups=50
```

**Key Functions**:
- `getCompanyPackageInfo()`: Returns current plan, maxEmployees, currentEmployees count
- `getAvailablePackages()`: Lists all packages with upgrade/downgrade eligibility
- `changePackage()`: Upgrade (immediate) or downgrade (scheduled for next billing)

### 4. Admin Payment Verification (`screens/admin/PaymentVerificationScreen.tsx`)
- Lists pending EFT payments
- Shows payment details, company info, proof image
- Admin can approve/reject with notes
- Upon approval: subscription activated, manager notified

---

## Current Seat Limit Enforcement

### Where Limits Are Checked
1. **Employee Signup** (`convex/users.ts` - `signUpEmployee()`)
   - Validates invite code exists and is unused
   - Increments company.employeeCount on successful signup
   - **No explicit seat limit check** - relies on invite code distribution

2. **Package Info Query** (`convex/packages.ts` - `getCompanyPackageInfo()`)
   - Returns maxEmployees from package tier
   - Counts current employees
   - Returns both for UI display

### Current Limitation
- **No enforcement**: System doesn't prevent adding employees beyond maxEmployees
- Relies on manager discipline and UI warnings
- No blocking mechanism in place

---

## Proposed EFT APK Licensing Flow with Seat Limits

### Phase 1: Enhanced Seat Limit Enforcement

#### 1.1 Add Seat Limit Validation
**Location**: `convex/users.ts` - `signUpEmployee()` mutation

```typescript
// Before incrementing employeeCount:
const company = await ctx.db.get(invite.companyId);
const packageInfo = PACKAGE_TIERS[company.planRef || 'starter'];

if (company.employeeCount >= packageInfo.maxEmployees) {
  throw new Error(
    `Seat limit reached. Current: ${company.employeeCount}/${packageInfo.maxEmployees}`
  );
}
```

#### 1.2 Add Seat Limit Check to Employee Addition
**New mutation**: `addEmployeeWithSeatCheck()`
- Validates seat availability before adding
- Returns error if limit exceeded
- Suggests upgrade path

### Phase 2: EFT Payment Licensing

#### 2.1 Modify EFT Payment Initiation
**Update**: `convex/eft.ts` - `initiateEFTPayment()`

```typescript
// Add seat limit info to response:
return {
  paymentId,
  paymentReference,
  amount,
  packageName: packageDetails.name,
  maxEmployees: packageDetails.maxEmployees,  // ← Add this
  maxGroups: packageDetails.maxGroups,        // ← Add this
  currentEmployees: company.employeeCount,   // ← Add this
  // ... rest
}
```

#### 2.2 Add License Key Generation
**New function**: `generateLicenseKey()`
- Format: `APK-{companyId}-{planRef}-{expiryDate}-{hash}`
- Hash includes: companyId + planRef + expiryDate (HMAC-SHA256)
- Stored in `eftPayments` table as `licenseKey` field

```typescript
export const generateLicenseKey = (
  companyId: string,
  planRef: string,
  expiryDate: number
): string => {
  const data = `${companyId}|${planRef}|${expiryDate}`;
  const hash = crypto.createHmac('sha256', 'LICENSE_SECRET_KEY')
    .update(data)
    .digest('hex')
    .substring(0, 16);
  return `APK-${companyId.substring(0, 8)}-${planRef}-${expiryDate}-${hash}`;
}
```

#### 2.3 Update Payment Verification
**Modify**: `convex/eft.ts` - `verifyEFTPayment()`

```typescript
if (args.verified) {
  const licenseKey = generateLicenseKey(
    payment.companyId.toString(),
    payment.packagePlan,
    paymentDueDate
  );
  
  await ctx.db.patch(args.paymentId, {
    status: "verified",
    verifiedAt: Date.now(),
    licenseKey,  // ← Store license key
    notes: args.notes,
  });
  
  // Activate subscription
  await ctx.db.patch(payment.companyId, {
    planRef: payment.packagePlan,
    subscriptionStatus: "active",
    lastPaymentDate: Date.now(),
    paymentDueDate,
    licenseKey,  // ← Store in company too
    updatedAt: Date.now(),
  });
}
```

#### 2.4 Add License Validation Query
**New query**: `validateLicenseKey()`

```typescript
export const validateLicenseKey = query({
  args: {
    licenseKey: v.string(),
  },
  returns: v.object({
    valid: v.boolean(),
    companyId: v.optional(v.id("companies")),
    planRef: v.optional(v.string()),
    maxEmployees: v.optional(v.number()),
    maxGroups: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    message: v.string(),
  }),
  async handler(ctx, args) {
    const payment = await ctx.db
      .query("eftPayments")
      .withIndex("by_license_key", (q) => q.eq("licenseKey", args.licenseKey))
      .first();
    
    if (!payment) {
      return { valid: false, message: "License key not found" };
    }
    
    if (payment.status !== "verified") {
      return { valid: false, message: "License not verified" };
    }
    
    if (payment.expiresAt < Date.now()) {
      return { valid: false, message: "License expired" };
    }
    
    const company = await ctx.db.get(payment.companyId);
    const packageInfo = PACKAGE_TIERS[payment.packagePlan];
    
    return {
      valid: true,
      companyId: payment.companyId,
      planRef: payment.packagePlan,
      maxEmployees: packageInfo.maxEmployees,
      maxGroups: packageInfo.maxGroups,
      expiresAt: payment.expiresAt,
      message: "License valid",
    };
  },
});
```

### Phase 3: APK-Side License Validation

#### 3.1 Store License Key Locally
**Location**: `lib/auth-context.tsx`

```typescript
export interface User {
  userId: string;
  email: string;
  fullName: string;
  role: 'admin' | 'manager' | 'employee';
  companyId?: Id<"companies">;
  companyName?: string;
  subscriptionStatus?: string;
  licenseKey?: string;  // ← Add this
  maxEmployees?: number; // ← Add this
  currentEmployees?: number; // ← Add this
}

// In signIn mutation response:
const company = await ctx.db.get(user.companyId);
return {
  // ... existing fields
  licenseKey: company.licenseKey,
  maxEmployees: PACKAGE_TIERS[company.planRef].maxEmployees,
  currentEmployees: company.employeeCount,
};
```

#### 3.2 Add License Validation on App Start
**Location**: `App.tsx` or auth initialization

```typescript
const validateAppLicense = async (user: User) => {
  if (!user.licenseKey) {
    // No license - show paywall
    return { valid: false, reason: "no_license" };
  }
  
  const validation = await validateLicenseKey({ licenseKey: user.licenseKey });
  
  if (!validation.valid) {
    // License invalid/expired - show paywall
    return { valid: false, reason: validation.message };
  }
  
  return { valid: true, ...validation };
};
```

#### 3.3 Enforce Seat Limits on Employee Addition
**Location**: `screens/AddEmployeeScreen.tsx` or employee signup

```typescript
const canAddEmployee = (currentEmployees: number, maxEmployees: number) => {
  return currentEmployees < maxEmployees;
};

// Before allowing employee signup:
if (!canAddEmployee(user.currentEmployees, user.maxEmployees)) {
  Alert.alert(
    'Seat Limit Reached',
    `You have reached the limit of ${user.maxEmployees} employees on your ${planName} plan.`,
    [
      { text: 'Upgrade Plan', onPress: () => navigation.navigate('PaywallScreen') },
      { text: 'Cancel', style: 'cancel' },
    ]
  );
  return;
}
```

### Phase 4: Schema Updates

#### 4.1 Add Fields to `eftPayments` Table
```typescript
eftPayments: defineTable({
  // ... existing fields
  licenseKey: v.optional(v.string()),  // ← Add
  licenseExpiresAt: v.optional(v.number()),  // ← Add
}).index("by_license_key", ["licenseKey"])  // ← Add index
```

#### 4.2 Add Fields to `companies` Table
```typescript
companies: defineTable({
  // ... existing fields
  licenseKey: v.optional(v.string()),  // ← Add
  licenseExpiresAt: v.optional(v.number()),  // ← Add
})
```

---

## Implementation Checklist

### Backend (Convex)
- [ ] Add seat limit validation to `signUpEmployee()`
- [ ] Add `generateLicenseKey()` utility function
- [ ] Update `verifyEFTPayment()` to generate and store license key
- [ ] Add `validateLicenseKey()` query
- [ ] Add `licenseKey` and `licenseExpiresAt` fields to schema
- [ ] Add index on `eftPayments.licenseKey`
- [ ] Create migration for existing payments (generate keys retroactively)

### Frontend (React Native)
- [ ] Update `AuthContext` to include licenseKey, maxEmployees, currentEmployees
- [ ] Update `signIn` mutation to return license info
- [ ] Add license validation on app startup
- [ ] Add seat limit check before employee signup
- [ ] Update employee addition screens to show seat limit warnings
- [ ] Add license expiry warning UI

### Admin Dashboard
- [ ] Display license key in payment verification screen
- [ ] Show license expiry date
- [ ] Add license renewal/extension UI

---

## Security Considerations

1. **License Key Format**: Include company ID + plan + expiry + HMAC signature
2. **Secret Key**: Store `LICENSE_SECRET_KEY` in Convex environment variables
3. **Validation**: Always validate on backend, never trust client-side license info
4. **Expiry**: Set reasonable expiry (30 days from payment verification)
5. **Revocation**: Add ability to revoke licenses if payment disputed

---

## Testing Scenarios

1. **Happy Path**: User pays → License generated → Employees can be added up to limit
2. **Seat Limit**: User at limit → Cannot add more employees → Upgrade prompt
3. **License Expiry**: License expires → Show renewal prompt
4. **Invalid License**: Tampered key → Validation fails → Show paywall
5. **Upgrade**: User upgrades plan → New license generated → Higher seat limit

---

## File References

### Core Authentication & Auth Context
- `lib/auth-context.tsx` - User auth state, session management
- `convex/users.ts` - User signup/signin, employee management

### Paywall & Payment
- `screens/PaywallScreen.tsx` - Main paywall UI with RevenueCat integration
- `screens/EFTPaymentScreen.tsx` - EFT payment UI
- `convex/eft.ts` - EFT payment backend logic
- `screens/admin/PaymentVerificationScreen.tsx` - Admin payment verification

### Package Management
- `convex/packages.ts` - Package tiers, seat limits, upgrade/downgrade logic
- `screens/PackageSelectionScreen.tsx` - Package selection UI
- `screens/PackageManagementScreen.tsx` - Manager package management

### Database Schema
- `convex/schema.ts` - Complete database schema including companies, users, eftPayments

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SIGNUP/LOGIN                             │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  AuthContext     │
                    │  (AsyncStorage)  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  signIn/signUp   │
                    │  (convex/users)  │
                    └──────────────────┘
                              │
                              ▼
                    ┌──────────────────┐
                    │  Check License   │
                    │  & Seat Limits   │
                    └──────────────────┘
                              │
                    ┌─────────┴─────────┐
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │ Valid License│    │ No License   │
            │ & Seats OK   │    │ Show Paywall │
            └──────────────┘    └──────────────┘
                    │                   │
                    ▼                   ▼
            ┌──────────────┐    ┌──────────────┐
            │ Grant Access │    │ Package      │
            │ to App       │    │ Selection    │
            └──────────────┘    └──────────────┘
                                        │
                        ┌───────────────┼───────────────┐
                        │               │               │
                        ▼               ▼               ▼
                    ┌────────┐    ┌────────┐    ┌────────┐
                    │Starter │    │  Pro   │    │Enterprise
                    │ 10 emp │    │ 50 emp │    │ 200 emp
                    └────────┘    └────────┘    └────────┘
                        │               │               │
                        └───────────────┼───────────────┘
                                        │
                                        ▼
                        ┌──────────────────────────┐
                        │ initiateEFTPayment()     │
                        │ Generate Reference      │
                        │ Create eftPayments rec  │
                        └──────────────────────────┘
                                        │
                                        ▼
                        ┌──────────────────────────┐
                        │ Show Banking Details     │
                        │ WhatsApp Integration     │
                        │ Upload Proof of Payment  │
                        └──────────────────────────┘
                                        │
                                        ▼
                        ┌──────────────────────────┐
                        │ Admin Verification      │
                        │ (PaymentVerificationUI) │
                        └──────────────────────────┘
                                        │
                        ┌───────────────┴───────────────┐
                        │                               │
                        ▼                               ▼
                    ┌──────────┐                ┌──────────┐
                    │ Approved │                │ Rejected │
                    └──────────┘                └──────────┘
                        │                               │
                        ▼                               ▼
            ┌──────────────────────┐        ┌──────────────────┐
            │ verifyEFTPayment()   │        │ Payment Failed   │
            │ Generate License Key │        │ Show Retry       │
            │ Activate Subscription│        └──────────────────┘
            │ Set Seat Limits      │
            └──────────────────────┘
                        │
                        ▼
            ┌──────────────────────┐
            │ Store License Key    │
            │ Update maxEmployees  │
            │ Grant Full Access    │
            └──────────────────────┘
                        │
                        ▼
            ┌──────────────────────┐
            │ Employee Addition    │
            │ Check Seat Limit     │
            │ Enforce maxEmployees │
            └──────────────────────┘
```

---

## Integration Points

### 1. Authentication System
- Extend `User` interface with `licenseKey`, `maxEmployees`, `currentEmployees`
- Update `signIn` to return license info from company record
- Add license validation on app startup

### 2. Employee Management
- Add seat limit check in `signUpEmployee()` before incrementing count
- Show seat limit warnings in employee addition screens
- Suggest upgrade when limit reached

### 3. Payment System
- Generate license key on payment verification
- Store license key in both `eftPayments` and `companies` tables
- Add license validation query for APK-side checks

### 4. Admin Dashboard
- Display license key in payment verification screen
- Show license expiry date
- Add license renewal/extension UI

---

## Next Steps

1. **Review** this architecture with the team
2. **Implement Phase 1**: Add seat limit enforcement
3. **Implement Phase 2**: Add license key generation
4. **Implement Phase 3**: Add APK-side validation
5. **Test** all scenarios thoroughly
6. **Deploy** with feature flags for gradual rollout
