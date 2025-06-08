# Unused Code Report

## Summary
This report identifies unused functions, components, and pages in the codebase that can be safely removed to reduce code clutter and improve maintainability.

## Unused Pages

### 1. `src/pages/MeetingsPage.tsx`
- **Status**: Completely unused
- **Description**: A page component for displaying meetings
- **Recommendation**: Remove this file entirely
- **Note**: While the page itself is unused, it uses the Badge and Card components which are used elsewhere

### 2. `src/pages/RegisterPage.tsx`
- **Status**: Completely unused
- **Description**: An older registration page that has been replaced by `RegistrationPage.tsx`
- **Recommendation**: Remove this file entirely
- **Note**: The app uses `RegistrationPage.tsx` instead

### 3. `src/pages/Admin/AdminDashboard.tsx`
- **Status**: Completely unused
- **Description**: Duplicate admin dashboard in the Admin subdirectory
- **Recommendation**: Remove this file entirely
- **Note**: The app uses `src/pages/AdminDashboard.tsx` (one level up) instead

## Unused Library Files

### 1. `src/lib/supabase-test.ts`
- **Status**: Completely unused
- **Description**: Appears to be a duplicate or alternative test file for Supabase
- **Recommendation**: Remove this file entirely
- **Note**: The app uses `test-supabase.ts` for testing Supabase connections

## Potentially Unused Functions

### 1. `validatePhoneNumber` from `src/lib/formValidation.ts`
- **Status**: Imported but not used
- **Description**: Phone number validation function
- **Location**: Imported in `src/pages/RegistrationPage.tsx` (line 15) but never called
- **Recommendation**: Remove the import from RegistrationPage.tsx, but keep the function as it may be useful for future use

## Used Components and Functions
The following were checked and confirmed to be in use:
- All UI components (Alert, Badge, Button, Card, DataTable)
- All Form components (CheckboxGroup, SelectField, TextField)
- All utility functions in `formatters.ts` (formatDate, formatCurrency)
- The `calculateMembershipStatus` function from `membershipStatus.ts`
- Most validation functions from `formValidation.ts` (except validatePhoneNumber as noted above)

## Recommendations

1. **Immediate Actions**:
   - Delete `src/pages/MeetingsPage.tsx`
   - Delete `src/pages/RegisterPage.tsx`
   - Delete `src/pages/Admin/AdminDashboard.tsx`
   - Delete `src/lib/supabase-test.ts`
   - Remove the unused import of `validatePhoneNumber` from `src/pages/RegistrationPage.tsx`

2. **Code Organization**:
   - Consider consolidating test-related files into a dedicated test directory
   - Ensure naming conventions are consistent (e.g., avoid having both `test-supabase.ts` and `supabase-test.ts`)

3. **Future Considerations**:
   - Implement a linting rule to detect unused exports
   - Consider using tools like `ts-prune` or `knip` for automated detection of unused code
   - Regular code reviews should include checking for unused imports and exports

## Impact
Removing these unused files will:
- Reduce codebase size by approximately 50+ KB
- Improve code maintainability by eliminating confusion about which components to use
- Make the project structure cleaner and easier to navigate
- Reduce build times slightly

Total files to be removed: 4
Total unused imports to clean up: 1