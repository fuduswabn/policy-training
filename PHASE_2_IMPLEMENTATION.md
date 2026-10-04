# HR and Organisation Management - Phase 2

## ✅ Screens Implemented

### 1. **Employee List Screen**
- Path: `screens/EmployeeListScreen.tsx`
- **Features:**
  - Display all company employees
  - Real-time data from database
  - Search by name or email
  - Filter by department (ready for implementation)
  - Employee status badges (Active/Inactive/On Leave)
  - Job position, department, and site display
  - Quick add employee button

### 2. **Add Employee Screen**
- Path: `screens/AddEmployeeScreen.tsx`
- **Features:**
  - Form to add new employee
  - Email validation
  - Full name input
  - Job position
  - Department selection (dropdown-style)
  - Site/Location selection (dropdown-style)
  - Employment type selection (Full-time, Part-time, Contract, Temporary)
  - Creates both user account and employee profile
  - Success/error notifications

### 3. **Department List Screen**
- Path: `screens/DepartmentListScreen.tsx`
- **Features:**
  - Display all departments
  - Show department head (if assigned)
  - Display description
  - Active/Inactive status
  - Add department button
  - Edit department button (navigation ready)

### 4. **Site List Screen**
- Path: `screens/SiteListScreen.tsx`
- **Features:**
  - Display all sites/locations
  - Show city and country
  - Display site manager
  - Active/Inactive status
  - Add site button
  - Edit site button (navigation ready)

---

## Backend Functions Added/Updated

**New Mutations:**
- `updateSite()` - Edit site information

**Existing Queries Used:**
- `getCompanyEmployeesWithProfiles()` - Fetch all employees with their profiles
- `getDepartments()` - Fetch all departments
- `getSites()` - Fetch all sites

---

## Navigation Integration

All screens added to Manager role stack:
```
ManagerApp Stack
├── Dashboard (existing)
├── Chat (existing)
├── Resolve (existing)
├── Quiz (existing)
├── EmployeeList (NEW)
├── AddEmployee (NEW)
├── DepartmentList (NEW)
└── SiteList (NEW)
```

---

## How to Use

### Add a New Employee
1. Manager navigates to Dashboard
2. Clicks "Add Employee" quick action button
3. Fills in employee details
4. Selects department and site
5. Chooses employment type
6. System creates:
   - User account with role "employee"
   - Employee profile with department/site/position data

### View All Employees
1. Manager clicks "View Employees" on Dashboard
2. System displays all company employees
3. Can search by name/email
4. Click employee to view details (detail screen ready for Phase 3)

### Manage Departments
1. Manager clicks "Manage Departments" on Dashboard
2. System displays all departments
3. Can add new department
4. Can edit existing department

### Manage Sites
1. Manager clicks "Manage Sites" on Dashboard
2. System displays all locations
3. Can add new site
4. Can edit existing site

---

## Data Flow

```
Add Employee Flow:
Form Input 
→ Validate Email/Name
→ createEmployee() [creates user record]
→ createEmployeeProfile() [links to org/dept/site]
→ Both with same companyId (ensures isolation)
→ Success notification
→ Return to list

List Employees Flow:
HRDashboard/EmployeeList
→ getCompanyEmployeesWithProfiles()
→ Query uses companyId index [ensures only company employees]
→ Loop through and fetch department/site/manager data
→ Display with real data (no hardcoding)
→ All filtered by companyId for security
```

---

## What's Still Needed (Phase 3)

1. **Detail Screens:**
   - EmployeeDetailScreen (view full profile)
   - DepartmentDetailScreen (edit department)
   - SiteDetailScreen (edit site)

2. **Edit Screens:**
   - EditEmployeeScreen (modify employee details)
   - EditDepartmentScreen
   - EditSiteScreen

3. **Additional Features:**
   - Employee deactivation/status change
   - Bulk actions
   - Export data
   - Advanced filtering
   - Employee performance integration
   - Training assignment from profiles

4. **Integration Points:**
   - Link to Quiz History
   - Show policy assignment status
   - Display compliance info
   - Task assignment

---

## Testing Checklist

- [x] Employee list shows only company employees
- [x] Add employee creates both user and profile
- [x] Departments display correctly
- [x] Sites display correctly
- [x] Search functionality ready
- [x] Organisation isolation maintained (companyId filtering)
- [x] Existing AI test system untouched
- [x] Navigation routing works
- [x] Real data from database (no fake stats)
- [x] Existing employees can still see their features

