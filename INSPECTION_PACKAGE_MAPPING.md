# Inspection Features - Package Mapping

## Overview
Inspection capabilities are now tiered across your package offerings. This ensures growing businesses have access to inspection tools while keeping the Starter tier focused on core learning.

---

## Package Feature Breakdown

### 🟦 Starter Package - $16/month
**Target**: Small teams getting started with learning

**Inspection Access**: ❌ NOT INCLUDED
- No inspection templates
- No vehicle/asset inspections
- No inspection history
- No AI photo comparison

**Why**: Starter is focused on core employee learning, daily quizzes, and basic support. Inspection features are typically needed by managers in growing operations.

---

### 🟩 Pro Package - $37/month
**Target**: Growing businesses with wellness & inspection needs

**Inspection Access**: ✅ FULL INSPECTION SUITE (Except AI Comparison)

Included Features:
1. **Inspection Templates**
   - Create custom inspection templates
   - 8 pre-defined categories (Vehicle, Equipment, Tools, Workplace, PPE, Safety, Site, Home/Work)
   - Configurable checklist items
   - Photo/comment requirements per item

2. **Vehicle Inspections**
   - Dedicated vehicle inspection workflow
   - Pre-configured vehicle checklist (tyres, lights, mirrors, body, windows, safety equipment, fluids, interior)
   - Mileage recording
   - Pass/Fail/N/A status tracking

3. **Asset & Equipment Inspections**
   - General asset inspection workflow
   - Flexible checklist customization
   - Baseline inspection marking
   - Follow-up action tracking
   - Photo capture per item
   - Comments and notes

4. **Inspection History**
   - Complete chronological inspection history per asset/vehicle
   - Status color-coding (Pass/Fail)
   - Expandable details view
   - Baseline indicators
   - Date/time tracking

**Not Included**:
- ❌ AI Photo Comparison (baseline photo analysis)
- ❌ AI damage detection

---

### 🟧 Enterprise Package - $130/month
**Target**: Large organizations with full support suite

**Inspection Access**: ✅ COMPLETE WITH AI

All Pro inspection features PLUS:

5. **AI Photo Comparison**
   - Side-by-side baseline vs. current photo comparison
   - LLM-powered AI analysis:
     - Damage detection
     - Visible changes identification
     - Missing components detection
     - Condition assessment (improved/same/deteriorated)
     - Confidence scoring (0-100%)
   - Human verification workflow
   - Pending review states
   - Advanced findings display

---

## Reseller Packages

### Reseller Starter - FREE (1 company)
- ❌ NO inspection features

### Reseller Professional - FREE (5 companies)
- ✅ Same as Pro package
- Inspection Templates
- Vehicle Inspections
- Asset Inspections
- Inspection History
- (No AI comparison)

### Reseller Enterprise - FREE (Unlimited companies)
- ✅ Same as Enterprise package
- All inspection features including AI Photo Comparison

---

## Upgrade Path

| User Journey | Starts | Needs | Upgrade to |
|--------------|--------|-------|-----------|
| Solo learner | Starter | Create inspection templates | Pro ($37) |
| Small team | Starter | Vehicle fleet tracking | Pro ($37) |
| Growing ops | Pro | AI damage detection | Enterprise ($130) |
| Large org | Pro | AI + unlimited company scale | Enterprise ($130) |

---

## Technical Implementation

### Package Entitlements
Stored in `.a0/monetization.yaml`:

```yaml
entitlements:
  - inspection_templates        # Pro + Enterprise + Reseller Pro/Enterprise
  - vehicle_inspections         # Pro + Enterprise + Reseller Pro/Enterprise
  - asset_inspections           # Pro + Enterprise + Reseller Pro/Enterprise
  - inspection_history          # Pro + Enterprise + Reseller Pro/Enterprise
  - ai_photo_comparison         # Enterprise + Reseller Enterprise ONLY
```

### Authorization Flow
When a user attempts to access inspection features:

1. **Backend Check**: `convex/inspections.ts` functions can check:
   ```typescript
   const company = await ctx.db.get(companyId);
   if (!company.planRef.includes("inspection_templates")) {
     throw new Error("Inspection not available in your plan");
   }
   ```

2. **Frontend Check**: App can hide/disable inspection UI based on entitlements

3. **Audit Trail**: All inspections logged with company context

---

## Next Steps

1. **Deploy Changes**: Click Deploy (top-right) to push OTA update
2. **Sync Providers** (Optional):
   ```bash
   provider_sync dryRun: true    # Preview changes
   provider_sync confirm: true   # Apply to App Store & Stripe
   ```
3. **UI Updates** (Optional): Hide inspection screens from Starter users
4. **Documentation**: Update customer-facing docs about inspection features

---

## Support

- Inspection Templates Screen: `screens/InspectionTemplatesScreen.tsx`
- Vehicle Inspection: `screens/VehicleInspectionScreen.tsx`
- Photo Comparison: `screens/PhotoComparisonScreen.tsx`
- Backend: `convex/inspections.ts`

For questions, see: `.a0/docs/payments.md` and `PACKAGE_CONFIGURATION.md`
