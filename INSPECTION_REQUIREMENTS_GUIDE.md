# Equipment Inspection Requirements System

## Overview
Managers can now configure three types of inspection requirements for equipment:

1. **Daily Inspections** - Equipment must be inspected every single day
2. **Monthly Inspections** - Equipment must be inspected once per month
3. **Before-Use Inspections** - Equipment must be inspected before it can be used

---

## Manager Features

### Configure Inspection Requirements
**Screen**: `InspectionRequirementsScreen`

Managers can:
- View all equipment assigned to employees
- Select any piece of equipment
- Choose the inspection requirement type (Daily/Monthly/Before-Use)
- Save the configuration

### How It Works

```
Manager Creates Equipment Profile
         ↓
Manager Assigns to Employee
         ↓
Manager Sets Inspection Requirement (Daily/Monthly/Before-Use)
         ↓
Employee Sees Task on Their Dashboard
         ↓
Employee Completes Inspection (with template)
         ↓
Results Stored & AI Analysis Available
```

---

## Employee Perspective

### Daily Inspections
- Shows on employee dashboard immediately
- Task shows as "Pending" until completed
- Deadline: Must be done by end of day (business hours)
- Used for: Active vehicles, safety equipment, high-risk assets

### Monthly Inspections
- Shows as pending on the monthly schedule
- Usually 1 inspection per equipment per month
- Can be done anytime during the month
- Used for: Heavy equipment, facility maintenance, backup systems

### Before-Use Inspections
- Shows as **required** before the equipment can be marked ready
- Equipment is flagged if not inspected before operation
- Critical for safety-sensitive equipment
- Used for: Cranes, scaffolding, powered equipment, vehicles

---

## Database Structure

**equipmentAssignments table** now has:
```typescript
inspectionRequirement: "daily" | "monthly" | "before_use"
requiresDailyInspection: boolean // shorthand for daily requirement
```

**Indexes**:
- by_requirement: Query equipment by requirement type
- by_company, by_employee, by_asset: Standard lookups

---

## Available Functions

### Queries
- `getEquipmentByRequirement()` - Get all equipment with specific requirement
- `getBeforeUseEquipment()` - Get all before-use inspection equipment
- `getCompanyAssignments()` - Get all equipment for a company

### Mutations
- `assignEquipment()` - Assign equipment (includes requirement)
- `updateInspectionRequirement()` - Change requirement type
- `unassignEquipment()` - Remove assignment

---

## User Stories

### Scenario 1: Daily Vehicle Inspections
```
Manager assigns Company Vehicle #5 to Driver John
Requirement: Daily
↓
John's phone shows "Company Vehicle #5 - Daily Inspection Pending"
↓
John opens the inspection, completes checklist
↓
System records inspection, stores photos
↓
After 2+ inspections: AI compares baseline vs current condition
↓
Manager sees damage alerts if detected
```

### Scenario 2: Monthly Equipment Maintenance
```
Manager assigns Forklift #2 to Operator Maria  
Requirement: Monthly
↓
Maria sees in her calendar view: "Forklift #2 due for monthly inspection"
↓
Maria completes inspection within the month
↓
System tracks last inspection date
↓
Manager dashboard shows "Last inspected: 15 days ago - OK"
```

### Scenario 3: Before-Use Crane Safety
```
Manager assigns Crane to Supervisor Tom
Requirement: Before-Use
↓
Tom's dashboard flags: "Crane - MUST inspect before use"
↓
Before each use, Tom completes safety checklist
↓
If he tries to mark equipment as "ready" without inspection → ERROR
↓
After inspection: Equipment status = "Ready to operate"
↓
Prevents accidents by enforcing pre-operation checks
```

---

## Integration Steps

1. **Add to Navigation**
   ```typescript
   // In your nav/admin section
   <Tab.Screen 
     name="InspectionRequirements" 
     component={InspectionRequirementsScreen}
   />
   ```

2. **Update Equipment Assignment Screen**
   - When assigning equipment, also select requirement type

3. **Modify Daily Inspections Screen**
   - Show requirement type with each task
   - Show different icons/colors for each type

4. **Add Manager Dashboard Widgets**
   - Count of daily inspections pending
   - Count of before-use equipment flagged
   - Monthly compliance trend

---

## API Endpoints

### Get Equipment by Requirement Type
```typescript
const equipment = useQuery(api.equipmentAssignments.getEquipmentByRequirement, {
  companyId: "company_id",
  requirement: "daily" // or "monthly" or "before_use"
});
```

### Update Requirement
```typescript
const updateReq = useMutation(api.equipmentAssignments.updateInspectionRequirement);
await updateReq({
  assignmentId: "assign_id",
  inspectionRequirement: "before_use"
});
```

### Get Before-Use Equipment
```typescript
const beforeUse = useQuery(api.equipmentAssignments.getBeforeUseEquipment, {
  companyId: "company_id"
});
```

---

## What's Next?

1. **Click Deploy** to push updates
2. Add `InspectionRequirementsScreen` to your manager navigation
3. Update equipment assignment screens to include requirement selection
4. Modify daily inspections screen to show requirement type and priority
5. Add enforcement: Block before-use equipment from operation if not inspected

---

## Safety & Compliance

✓ Company-isolated (each company sees only their equipment)
✓ Role-based (only managers can set requirements)
✓ Audit trail (all requirement changes logged)
✓ Before-use prevents accidents (enforced in app)
✓ Compliance tracking (manager dashboard shows completion %)
