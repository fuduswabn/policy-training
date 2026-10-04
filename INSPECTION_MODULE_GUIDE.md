# Inspection Management Module

## Overview

This module provides a comprehensive asset inspection system with support for:
- Reusable inspection templates
- Photo-based baseline and follow-up inspections
- AI-powered photo comparison with damage detection
- Vehicle-specific inspection workflows
- Inspection history tracking

## Features

### 1. Inspection Templates (Manager Feature)

**Screen:** `InspectionTemplatesScreen`

Managers can create and manage reusable inspection templates for:
- Vehicle Inspection
- Equipment Inspection
- Tools Inspection
- Workplace Inspection
- PPE Inspection
- Safety Inspection
- Site Inspection
- Home/Work Equipment Inspection

Each template includes:
- Configurable checklist items
- Pass/Fail status options
- Comment requirements
- Photo requirements

### 2. General Inspection Workflow

**Screen:** `InspectionChecklistScreen`

During inspection, inspectors can:
- Complete checklist items (Pass/Fail/N/A)
- Add photos for each item
- Add comments and notes
- Mark follow-up actions
- Designate as baseline inspection

**Features:**
- Baseline inspection flag (first inspection of an asset)
- Follow-up inspection capability
- Overall condition assessment (Pass/Fail)
- Photo capture with captions
- Comment fields

### 3. Vehicle Inspection Workflow

**Screen:** `VehicleInspectionScreen`

Specialized workflow for vehicle inspections with:
- Vehicle profile selection
- Mileage recording
- Pre-configured checklist:
  - Tyres
  - Lights
  - Mirrors
  - Body Condition
  - Windows
  - Safety Equipment
  - Fluids
  - Interior
  - General Condition

### 4. Photo-Based Baseline Comparison

**Screen:** `PhotoComparisonScreen`

AI-powered comparison between baseline and current inspections:
- Side-by-side photo comparison
- AI analysis shows:
  - Possible damage areas
  - Visible changes
  - Missing components
  - Condition assessment
  - Confidence score
  - Recommendations
- Human verification flag when needed

**AI Capabilities:**
- Detects visible changes and damage
- Identifies missing components
- Provides confidence scores
- Flags for human review
- Recommends actions

### 5. Inspection History

**Screen:** `InspectionHistoryScreen`

View all inspections for an asset/vehicle:
- Chronological history
- Baseline indicator
- Pass/Fail status
- Detailed inspection view
- Follow-up notes
- Checklist compliance

## Database Schema

### inspectionTemplates
- Stores reusable inspection templates
- Indexed by company for multi-tenant support
- Includes configurable checklist items

### vehicleProfiles
- Vehicle registration, fleet number, make/model
- Driver assignment
- Mileage tracking
- Service history

### assetProfiles
- General equipment and asset tracking
- Location and assignment
- Condition tracking
- Warranty management

### inspections
- Individual inspection records
- Checklist responses
- Baseline/follow-up distinction
- Overall condition assessment
- Follow-up action tracking

### inspectionPhotos
- Photos linked to inspections
- Storage IDs for Convex
- Captions and angles
- Photo ordering

### baselineComparisons
- AI-powered photo comparisons
- Analysis status tracking
- AI findings (damage, changes, missing components)
- Human verification records
- Confidence scores

## Backend API

All functions are in `convex/inspections.ts`:

### Template Management
- `createTemplate()` - Create inspection template
- `getTemplates()` - Get all templates for company

### Vehicle Management
- `createVehicle()` - Add vehicle profile
- `getVehicles()` - Get all vehicles for company

### Asset Management
- `createAsset()` - Add asset profile

### Inspection Operations
- `createInspection()` - Submit inspection
- `getInspection()` - Get inspection details
- `getInspectionHistory()` - Get history for asset/vehicle

### AI Comparison
- `createComparison()` - Create baseline comparison
- `getComparisons()` - Get comparisons for asset

## Implementation Notes

### Photo Storage
- Uses Convex built-in file storage
- Storage IDs stored in database
- Public URLs generated for display
- Supports multiple photos per inspection

### AI Analysis
- Currently configured for pending status
- Ready for integration with image analysis API
- Supports confidence scoring
- Includes human verification workflow

### Multi-Tenant Support
- All operations scoped by companyId
- Indexed queries for performance
- Company isolation enforced

### Data Integrity
- Baseline inspection flag prevents deletion
- Inspection history preserved
- Audit trail via timestamps

## Next Steps for Production

1. **Photo Upload Integration**
   - Implement Convex file upload in screens
   - Add image compression
   - Handle storage limits

2. **AI Integration**
   - Connect to image analysis API
   - Process baseline comparisons asynchronously
   - Add batch processing for large assets

3. **Reporting**
   - Generate inspection reports
   - Create asset condition history charts
   - Export inspection data

4. **Notifications**
   - Alert managers of failed inspections
   - Follow-up action reminders
   - Inspection schedule alerts

5. **Mobile Optimization**
   - Offline photo capture
   - Background sync
   - Location-based inspections

## Screen Navigation

From Manager Dashboard:
- Inspection Templates → Create/Edit Templates
- Vehicle Inspection → Select Vehicle → Complete Inspection
- Inspection History → View Asset History
- Photo Comparison → View AI Analysis

## Usage Example

1. **Setup Phase:**
   - Manager creates "Vehicle Inspection" template with checklist
   - Manager adds vehicles to system

2. **Baseline Phase:**
   - Inspector selects vehicle
   - Takes photos from multiple angles
   - Completes checklist → Submit as Baseline

3. **Follow-up Phase:**
   - Inspector performs new inspection
   - System compares to baseline
   - AI provides damage assessment
   - Inspector confirms findings

4. **Analysis Phase:**
   - View comparison with AI findings
   - Check confidence score
   - Review recommendations
   - Mark follow-up actions

## Support

For issues or feature requests related to the inspection module, check:
- Database logs in `.a0/logs/convex/`
- Screen navigation in `App.tsx`
- Backend functions in `convex/inspections.ts`
