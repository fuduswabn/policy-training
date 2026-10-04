# AI Photo-Based Asset Inspection

## Overview

The inspection module now includes AI-powered photo comparison using the a0 LLM API. This allows employees to compare baseline asset conditions with current conditions and get intelligent analysis of changes and damage.

## How It Works

### 1. Baseline Inspection
- Employee takes photos of the asset from multiple angles
- System saves these as the baseline condition
- Photos include: front, side, top, detail views, etc.

### 2. Follow-Up Inspection
- Employee performs inspection and takes new photos
- System initiates AI analysis comparing baseline vs current photos
- AI analysis runs on the a0 LLM API

### 3. AI Analysis
The AI performs the following analysis:

**Damage Detection**
- Identifies visible damage or deterioration
- Flags rust, corrosion, or wear patterns
- Detects structural issues or misalignment

**Change Identification**
- Visible changes between baseline and current
- Missing or broken components
- Condition changes (improved/same/deteriorated)

**Confidence Scoring**
- Confidence level (0-100%) for the analysis
- Higher confidence = more reliable findings

**Human Review Flagging**
- Automatically flags items requiring human verification
- Never makes definitive safety/legal conclusions
- Focuses on observable changes only

### 4. Human Verification
- Manager/Inspector reviews AI findings
- Can approve findings or request additional review
- Documents verification with notes

## API Integration

### Endpoint
```
POST https://api.a0.dev/ai/llm
```

### Request Format
```json
{
  "messages": [
    {
      "role": "user",
      "content": "Compare baseline and current photos..."
    }
  ],
  "schema": {
    "type": "object",
    "properties": {
      "damageFlagged": { "type": "boolean" },
      "visibleChanges": { "type": "array", "items": { "type": "string" } },
      "missingComponents": { "type": "array", "items": { "type": "string" } },
      "conditionAssessment": { "type": "string" },
      "confidence": { "type": "number" },
      "requiresHumanReview": { "type": "boolean" },
      "findings": { "type": "string" }
    }
  }
}
```

### Response Format
```json
{
  "damageFlagged": true,
  "visibleChanges": ["Tire tread worn", "Windshield slightly cracked"],
  "missingComponents": [],
  "conditionAssessment": "deteriorated",
  "confidence": 85,
  "requiresHumanReview": true,
  "findings": "Detailed description of findings..."
}
```

## Convex Functions

### analyzePhotos (Action)
Calls the LLM API to analyze photo pair.
```
await analyzePhotos({
  baselinePhotoUrl: string,
  currentPhotoUrl: string,
  assetType: string,
  assetName: string
})
```

### updateComparisonWithAnalysis (Mutation)
Updates a comparison record with AI analysis results.
```
await updateComparisonWithAnalysis({
  comparisonId: Id<"baselineComparisons">,
  analysis: {...}
})
```

### verifyComparison (Mutation)
Records human verification of AI findings.
```
await verifyComparison({
  comparisonId: Id<"baselineComparisons">,
  verified: boolean,
  verifiedBy: Id<"users">,
  verificationNotes: string
})
```

## Data Model

### baselineComparisons Table
- `companyId`: Company reference
- `assetId`: Asset being compared
- `baselineInspectionId`: Original inspection
- `currentInspectionId`: Follow-up inspection
- `baselinePhotoId`: Baseline photo
- `currentPhotoId`: Current photo
- `analysisStatus`: pending → pending_review → verified
- `aiAnalysis`: Analysis results object
- `humanVerification`: Verification details
- `createdAt`, `updatedAt`: Timestamps

## Safety Considerations

### What AI Does NOT Do
- ✗ Make definitive safety conclusions
- ✗ Determine legal compliance
- ✗ Provide binding recommendations
- ✗ Replace professional inspections

### What AI DOES Do
- ✓ Flag visible changes and differences
- ✓ Identify potential damage areas
- ✓ Highlight missing components
- ✓ Provide confidence scores
- ✓ Flag items for human review
- ✓ Document analysis for records

### Human Verification Required
All AI findings requiring action must be verified by a qualified inspector:
- Damage assessment
- Component replacement decisions
- Safety determinations
- Remediation actions

## User Workflow

### For Inspectors
1. Take baseline photos during initial inspection
2. Save inspection with baseline flag
3. Perform follow-up inspection
4. Take follow-up photos from same angles
5. Trigger AI analysis
6. Review AI findings
7. Approve or request additional review

### For Managers
1. Monitor inspection progress
2. Review AI analysis results
3. Verify findings as needed
4. Track historical comparisons
5. Generate compliance reports
6. Document remediation actions

## Screens

### PhotoComparisonScreen
- Displays all comparisons for an asset
- Shows AI analysis status
- Lists findings with icons
- Shows confidence scores
- Allows human verification workflow

### InspectionChecklistScreen
- Captures inspection photos
- Links photos to inspection
- Triggers baseline flag if needed
- Stores inspection record

### InspectionHistoryScreen
- View all inspections for an asset
- Track baseline and follow-up inspections
- See comparison history
- Generate historical reports

## Error Handling

If AI analysis fails:
- System defaults to requiring human review
- Records "analysis_failed" status
- Notifies manager/inspector
- Allows manual findings entry
- Falls back to human verification

## Privacy & Compliance

- Photos stored securely
- Analysis data retained per policy
- Verifications documented
- Full audit trail maintained
- Compliant with data retention requirements

## Next Steps

1. Test photo upload functionality
2. Validate API integration
3. Train inspectors on process
4. Set confidence thresholds
5. Establish verification workflows
6. Generate usage reports
7. Optimize based on feedback

