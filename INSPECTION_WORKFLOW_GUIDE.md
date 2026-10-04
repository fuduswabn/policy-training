# Complete Inspection Workflow Guide

## 🎯 Quick Answer to Your Questions

### 1️⃣ **Where do I find created templates?**
**For Managers**: 
- Dashboard → "Create Template" card
- Or navigate to **Inspection Templates Screen**
- All templates appear in a list, searchable by name and category

### 2️⃣ **How do my staff access templates?**
**For Inspectors/Staff**:
- Dashboard → "Inspections" quick action card
- Or navigate to **Vehicle Inspection Screen**
- Templates are automatically loaded based on their role
- They select an asset (vehicle/equipment/workplace) to use a template

### 3️⃣ **How do I assign people to perform inspections?**
**Assignment is Implicit** (happens automatically):
- When an inspector selects a vehicle/asset, they are assigned
- System automatically records: who (inspectorId), what (assetId), when (timestamp)
- No manual assignment step needed
- Multiple inspectors can perform inspections on the same asset over time

### 4️⃣ **Where do I see inspection results?**
**For Results Viewing**:
- Dashboard → "Inspection History" card
- Or navigate to **Inspection History Screen**
- Shows all completed inspections for each asset
- Tap any inspection to view details

### 5️⃣ **Where are the AI analysis outcomes?**
**For AI Analysis & Comparison**:
- **Inspection History Screen** → View inspection → See AI Analysis section
- Or navigate to **Photo Comparison Screen**
- Shows AI-powered damage detection, changes, and recommendations
- AI only activates on **baseline comparisons** (Enterprise feature)

---

## 🗺️ Navigation Map

```
HOME SCREEN (Dashboard)
├─ "Create Template" card → INSPECTION TEMPLATES SCREEN
│  ├─ Create new template
│  ├─ Select type: Vehicle, Equipment, Tools, Workplace, PPE, etc.
│  └─ Add checklist items
│
├─ "Inspections" card → VEHICLE INSPECTION SCREEN
│  ├─ Browse available vehicles/assets
│  ├─ Select vehicle → INSPECTION CHECKLIST SCREEN
│  │  ├─ Inspector completes checklist
│  │  ├─ Adds photos for each item
│  │  ├─ Marks as Baseline or Follow-up
│  │  └─ Submits inspection
│  │
│  └─ Results stored in database
│
└─ "Inspection History" card → INSPECTION HISTORY SCREEN
   ├─ View all past inspections
   ├─ Tap inspection → INSPECTION DETAILS
   │  ├─ Checklist responses
   │  ├─ Photos
   │  ├─ Comments & notes
   │  └─ AI Analysis (if available)
   │
   └─ View Photo Comparison → PHOTO COMPARISON SCREEN
      ├─ Baseline vs Current comparison
      ├─ AI damage detection
      ├─ Changes detected
      ├─ Confidence score
      └─ Verification status
```

---

## 📊 Data Flow & Storage

### Step 1: Template Creation (Manager)
```
Manager creates template
↓
InspectionTemplatesScreen.tsx
↓
Convex: inspections.createTemplate()
↓
Stored in: inspectionTemplates table
│ ├─ name: "Daily Vehicle Check"
│ ├─ companyId: "company-123"
│ ├─ type: "vehicle"
│ ├─ items: [
│ │   { name: "Tires", required: true, requiresPhoto: true },
│ │   { name: "Lights", required: true, requiresPhoto: false }
│ │ ]
│ └─ createdDate: timestamp
```

### Step 2: Inspection Assignment & Execution (Inspector)
```
Inspector selects vehicle
↓
VehicleInspectionScreen.tsx
↓
Inspector navigates to InspectionChecklistScreen.tsx with:
├─ templateId: "template-123"
├─ vehicleId: "vehicle-456"
└─ assetType: "vehicle"
↓
Inspector completes checklist:
├─ Sets item status (Pass/Fail/N/A)
├─ Adds photos via camera
├─ Marks as Baseline (first) or Follow-up
└─ Adds comments
↓
Convex: inspections.createInspection()
↓
Stored in: inspections table
│ ├─ companyId: "company-123"
│ ├─ inspectorId: "user-789" ← Auto-assigned
│ ├─ templateId: "template-123"
│ ├─ vehicleId: "vehicle-456"
│ ├─ checklist: [
│ │   { item: "Tires", status: "pass", comment: "Good condition", photo: "photo-id" },
│ │   { item: "Lights", status: "fail", comment: "Left side broken", photo: "photo-id" }
│ │ ]
│ ├─ overallCondition: "fail" ← AI-determined
│ ├─ isBaseline: true
│ ├─ status: "submitted"
│ ├─ dateTime: timestamp
│ └─ followUpActionRequired: true
```

### Step 3: Photo Storage
```
Photos uploaded during inspection
↓
Stored in: inspectionPhotos table
│ ├─ inspectionId: "inspection-001"
│ ├─ itemId: "item-123"
│ ├─ storageId: "storage-file-id"
│ ├─ originalFileName: "tire-damage.jpg"
│ └─ uploadedAt: timestamp
```

### Step 4: Results Display (Manager/Inspector)
```
InspectionHistoryScreen.tsx
↓
Query: getInspectionHistory(assetId)
↓
Displays all inspections:
├─ Inspection #1 (Baseline) - Jan 10, 2024 - PASS
├─ Inspection #2 (Follow-up) - Jan 17, 2024 - FAIL
│  └─ Tap to view details & AI analysis
└─ Inspection #3 (Follow-up) - Jan 24, 2024 - PASS
```

### Step 5: AI Analysis (Enterprise Feature Only)
```
Baseline inspection (isBaseline: true)
+ Follow-up inspection (isBaseline: false)
↓
Automatic trigger: analyzePhotos() action
↓
Convex AI calls LLM API:
├─ Compares baseline photos with follow-up photos
├─ Detects damage/changes
├─ Scores confidence (0-100)
└─ Flags if human review needed
↓
Stored in: baselineComparisons table
│ ├─ baselineInspectionId: "inspection-001"
│ ├─ followUpInspectionId: "inspection-002"
│ ├─ companyId: "company-123"
│ ├─ vehicleId: "vehicle-456"
│ ├─ analysis: {
│ │   damageFlagged: true
│ │   visibleChanges: ["Left tire flat", "Windshield crack"]
│ │   missingComponents: ["Side mirror"]
│ │   conditionAssessment: "deteriorated"
│ │   confidence: 92
│ │   requiresHumanReview: true
│ │   findings: "Vehicle shows signs of impact damage..."
│ │ }
│ ├─ status: "pending_review"
│ └─ createdAt: timestamp
```

### Step 6: AI Results Review (Manager)
```
InspectionHistoryScreen.tsx
↓
Tap inspection with comparison
↓
PhotoComparisonScreen.tsx
↓
Displays:
├─ Baseline photos (left side)
├─ Current photos (right side)
├─ Side-by-side comparison
├─ AI Findings:
│  ├─ "🚨 Damage Detected: Left tire is flat"
│  ├─ "Confidence: 92%"
│  ├─ "Changes: 3 areas of damage"
│  ├─ "Missing Components: 1"
│  └─ "Status: Requires human verification"
├─ Action buttons:
│  ├─ "Approve Analysis"
│  ├─ "Request Manual Review"
│  └─ "Add Notes"
└─ Notes history
```

---

## 🔄 Complete Inspection Lifecycle

### Timeline Example: Vehicle Daily Check

**Day 1 - Setup (Manager)**
```
08:00 AM → Manager creates template "Daily Vehicle Check"
         ├─ Items: Tires, Lights, Windows, Interior
         └─ Template stored in system
```

**Day 2 - First Inspection (Inspector)**
```
09:30 AM → Inspector starts VehicleInspectionScreen
09:35 AM → Selects "Vehicle #VH-001" 
09:36 AM → Opens InspectionChecklistScreen
         ├─ Tires: Pass
         ├─ Lights: Pass
         ├─ Windows: Pass
         ├─ Interior: Fail (Damage noticed)
         └─ Marks as "Baseline"
09:45 AM → Submits inspection
         └─ Stored: inspections table
             Status: "submitted"
```

**Day 9 - Follow-up Inspection (Different Inspector)**
```
09:30 AM → Same inspector/different inspector selects same vehicle
09:36 AM → Opens InspectionChecklistScreen (same template)
         ├─ Tires: Pass
         ├─ Lights: Pass
         ├─ Windows: Pass
         ├─ Interior: Pass (Fixed)
         └─ Marks as "Follow-up"
09:45 AM → Submits inspection
         └─ Stored: inspections table
             Status: "submitted"
```

**Day 9 - AI Analysis (System)**
```
09:46 AM → System detects Follow-up of Baseline
09:47 AM → Triggers: analyzePhotos() action
         ├─ Compares all baseline photos with follow-up
         ├─ Analyzes damage/changes
         └─ Returns findings with confidence scores
09:50 AM → Results stored: baselineComparisons table
         └─ Status: "pending_review"
            Findings: "Interior damage has been repaired.
                       Confidence: 95%"
```

**Day 9 - Manager Review**
```
10:00 AM → Manager opens Dashboard
10:01 AM → Clicks "Inspection History"
10:02 AM → Selects "Vehicle #VH-001"
         └─ Sees both inspections listed
10:03 AM → Taps Inspection #2 → Sees details
10:05 AM → Views PhotoComparisonScreen
         ├─ Sees baseline and follow-up photos
         ├─ Reads AI findings
         ├─ Reviews confidence score (95%)
         └─ Clicks "Approve Analysis"
10:06 AM → Status updated: "verified"
         └─ Can now close out maintenance ticket
```

---

## 📱 Screen Access Quick Reference

| Screen | Purpose | Who Uses | How to Access |
|--------|---------|----------|---------------|
| **Inspection Templates** | Create/manage templates | Managers | Dashboard → "Create Template" |
| **Vehicle Inspection** | Select asset & start | Inspectors | Dashboard → "Inspections" |
| **Inspection Checklist** | Complete inspection | Inspectors | After selecting vehicle |
| **Inspection History** | View past inspections | Managers/Inspectors | Dashboard → "Inspection History" |
| **Photo Comparison** | View AI analysis | Managers/Inspectors | Inspection History → Tap inspection |

---

## ⚠️ Key Limitations

**Current limitations you should know:**

1. **No explicit assignment UI** - Assignment happens implicitly when inspector selects an asset
   - **Workaround**: Train inspectors on which vehicles/assets they should inspect
   - **Future enhancement**: Add assignment screen for managers to assign specific inspections

2. **No assignment history** - Can't see who inspected what unless you check the inspection record
   - **Workaround**: Review inspection details (inspectorId field shows who did it)
   - **Data available**: inspectorId in inspection record

3. **No bulk assignment** - Can't assign multiple inspections at once
   - **Workaround**: Each inspector selects their assets individually
   - **Future enhancement**: Add batch assignment capability

4. **AI analysis requires baseline** - Must have initial inspection before AI kicks in
   - **This is by design**: First inspection establishes baseline
   - **Timeline**: AI analysis only on 2nd+ inspections

---

## 🚀 Next Steps

1. **Test the workflow**:
   - Create a template in Inspection Templates Screen
   - Have an inspector complete an inspection in Vehicle Inspection Screen
   - View results in Inspection History Screen

2. **For AI results** (Enterprise only):
   - Do 2+ inspections on same vehicle
   - AI will automatically compare and analyze
   - View Photo Comparison Screen for AI findings

3. **Assign work**:
   - Train inspectors on their scheduled assets
   - System tracks who did what via inspectorId
   - Review historical data by opening inspection details

4. **Optional: Add explicit assignment screen**:
   - If you want managers to assign specific inspections to specific people
   - Can request this feature development

---

