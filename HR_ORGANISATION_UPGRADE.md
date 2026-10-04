# HR and Organisation Management Foundation

## Overview

This upgrade adds a **complete HR and Organisation Management foundation** to the Policy Training App while **preserving all existing features**, especially the AI-generated daily quiz system which remains the core functionality.

**Key Principle**: The existing AI test generation system is completely untouched and continues to work exactly as before.

---

## What Was Added

### 1. Database Schema Extensions (convex/schema.ts)

**New Tables:**

#### `departments`
- Per-company departments
- Department head/manager assignment
- Active status tracking
- Indexes: by_company, by_active

#### `sites`
- Per-company locations/sites
- Address, city, country
- Site manager assignment
- Active status tracking
- Indexes: by_company, by_active

#### `employeeProfiles`
- Extended employee information linked to users
- Department and site assignment
- Job position tracking
- Employment type (full_time, part_time, contract, temporary)
- Status tracking (active, inactive, on_leave, suspended)
- Direct manager assignment
- Start date tracking
- Indexes: by_user, by_company, by_department, by_site, by_manager, by_status

#### `customRoles`
- Custom role definitions per company
- Permissions array (extensible for future RBAC)
- System vs custom role distinction
- For future role-based access control

#### `userRoles`
- User to custom role assignments
- For future granular permissions

**Schema Update:**
- Expanded `users.role` field to support new roles:
  - `admin` (existing)
  - `manager` (existing)
  - `employee` (existing)
  - `hr_manager` (new)
  - `hr_officer` (new)
  - `compliance_officer` (new)

### 2. New Backend Functions (convex/hr.ts)

**Department Management:**
- `createDepartment` - Create department with optional head
- `getDepartments` - Query departments with head names
- `updateDepartment` - Update department info

**Site Management:**
- `createSite` - Create site/location
- `getSites` - Query sites with manager names
- (Update function can be added in Phase 2)

**Employee Profiles:**
- `createEmployeeProfile` - Create profile linked to user
- `getEmployeeProfile` - Retrieve profile with resolved names
- `getCompanyEmployeesWithProfiles` - Query all employees with profiles
- `updateEmployeeProfile` - Update profile (department, site, job position, status)

**HR Dashboard:**
- `getHRDashboardStats` - Real dashboard data:
  - Total employees
  - Active employees
  - Department count
  - Site count
  - On leave count
  - New hires this month
  - Department breakdown with employee counts

### 3. Security Updates (convex/security.ts)

**Updated Functions:**
- `requireCompanyManager()` - Now accepts both "manager" and "hr_manager" roles
- `requireCompanyMember()` - Updated to accept string array for role flexibility

### 4. New Screens

#### HRDashboard.tsx
- Real-time organisation metrics
- Department breakdown with visual progress bars
- Quick action buttons:
  - Add Employee
  - Manage Departments
  - Manage Sites
  - View Employees
- No hardcoded data - all from database queries

---

## Multi-Company Isolation (Already Working + Reinforced)

**Organisation-Level Isolation Preserved:**
- Each `company` is isolated
- All new tables use `companyId` foreign key
- All queries filter by `companyId`
- All backend functions verify company membership
- **One company CANNOT access another company's data**

**Example Query Pattern:**
```typescript
await ctx.db
  .query("departments")
  .withIndex("by_company", (q) => q.eq("companyId", args.companyId))
  .collect();
```

---

## Preservation of Existing Features

### AI Test Generation System ✅
- **UNTOUCHED** - Daily quiz generation works exactly as before
- All 8 steps of the pipeline preserved:
  1. Policy selection via rotation
  2. Reading material generation
  3. Quiz shell creation
  4. Question pre-generation
  5. Question history tracking
  6. Fallback template questions
  7. Policy cycle tracking
  8. Automatic scheduling
  
### Employee Quiz System ✅
- Employees still take daily quizzes
- Script reading → Quiz completion → Scoring
- Manager notifications on quiz failures
- Weekly summary reports

### Company Functionality ✅
- Existing companies still work
- New HR features are optional
- Backward compatible

### User Authentication ✅
- Email/password login unchanged
- Invite code system unchanged
- Role-based navigation preserved

---

## Current State vs Future Phases

### Phase 1: Foundation (✅ COMPLETE)
- ✅ Database schema for departments, sites, employee profiles
- ✅ HR dashboard with real data
- ✅ New role types (hr_manager, hr_officer, compliance_officer)
- ✅ Backend queries for employee management
- ✅ Security functions updated

### Phase 2: Frontend Screens (Ready to Build)
- Employee list with profiles
- Employee add/edit forms
- Department management
- Site management
- Employee search and filtering

### Phase 3: Advanced Features (Future)
- Role-based access control (RBAC) using customRoles table
- Compliance tracking per employee
- Training history per employee
- Performance analytics
- Leave management
- Employee hierarchy/org chart

---

## How to Use

### Adding an Employee with Profile

```typescript
// 1. Create user (existing flow)
const userId = await ctx.db.insert("users", {
  email: "employee@company.com",
  password: hashPassword("password"),
  fullName: "John Doe",
  role: "employee",
  companyId: companyId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});

// 2. Create profile (new)
await ctx.db.insert("employeeProfiles", {
  userId: userId,
  companyId: companyId,
  departmentId: departmentId,
  siteId: siteId,
  jobPosition: "Manager",
  managerId: managerId,
  startDate: Date.now(),
  employmentType: "full_time",
  status: "active",
  isActive: true,
  createdBy: hrManagerId,
  createdAt: Date.now(),
  updatedAt: Date.now(),
});
```

### Viewing HR Dashboard

```typescript
// In React component
const stats = useQuery(
  api.hr.getHRDashboardStats,
  { companyId, userId }
);

// Returns:
// - totalEmployees
// - activeEmployees
// - departmentCount
// - siteCount
// - onLeaveCount
// - newHiresThisMonth
// - departmentBreakdown []
```

---

## Verification Checklist

After deployment, verify:

1. ✅ **Existing AI test generation still works**
   - Manager uploads policy
   - Quiz automatically generates each day
   - Questions appear with AI-generated content
   - Employees can take quizzes

2. ✅ **Existing users can still log in**
   - Admin/Manager/Employee logins unchanged
   - Companies still have their data

3. ✅ **New HR features available**
   - Can create departments
   - Can create sites
   - Can create employee profiles
   - HR dashboard shows real data

4. ✅ **Organisation isolation maintained**
   - Company A cannot see Company B's data
   - All queries filtered by companyId

5. ✅ **New roles work**
   - hr_manager can access HR functions
   - manager role still works
   - employee role unchanged

---

## Technical Details

### Indexes Added
All new tables have optimized indexes for common queries:
- `departments.by_company`
- `departments.by_active`
- `sites.by_company`
- `sites.by_active`
- `employeeProfiles.by_user`
- `employeeProfiles.by_company`
- `employeeProfiles.by_department`
- `employeeProfiles.by_site`
- `employeeProfiles.by_manager`
- `employeeProfiles.by_status`

### Query Performance
All HR queries include:
- Proper indexing for fast lookups
- Pagination-ready (can add limits later)
- Efficient joins (no N+1 queries)

### Data Safety
- All HR functions require authentication
- All functions verify company membership
- One company cannot access another's data
- Manager role required for modifications

---

## Next Steps

1. **Deploy this foundation** (already ready)
2. **Build HR screens** (list, add, edit employees, departments, sites)
3. **Connect to daily quizzes** (show employee training within profile)
4. **Add compliance tracking** (which policies each employee has acknowledged)
5. **Build performance dashboard** (employee quiz scores, compliance status)
6. **Implement RBAC** (using customRoles table)

---

## Files Modified

- `convex/schema.ts` - Added 5 new tables + expanded roles
- `convex/hr.ts` - Created (all HR backend functions)
- `convex/security.ts` - Updated to accept new roles
- `screens/HRDashboard.tsx` - Created (HR dashboard with real data)

**No existing files were broken or removed.**

