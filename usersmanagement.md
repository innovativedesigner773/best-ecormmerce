## Users Management Implementation

This document summarizes the implementation for managing users on `http://localhost:3000/admin/users` without introducing new SQL scripts for registration and reusing existing methods.

### Overview
- Added staff creation via existing signup method (no changes to the public Register page).
- Implemented admin-only user listing with search, role filter, and activate/deactivate.
- Fixed RLS recursion by introducing a helper function for admin checks and updated policies to allow admins to read/update all profiles.

### Files Added
- `src/components/admin/AddStaffModal.tsx`
  - Reuses `useAuth().signUp` to create users with roles `cashier` or `admin` only.
  - On success, closes and triggers a parent refresh.

- `src/components/admin/UserList.tsx`
  - Fetches from `public.user_profiles` and displays a table with:
    - Search (by name or email)
    - Role filter (All/Customer/Cashier/Staff/Manager/Admin)
    - Activate/Deactivate toggle (updates `is_active`)
  - Uses `supabase` client directly; relies on RLS to permit admin access.

### File Updated
- `src/pages/admin/Users.tsx`
  - Added search input and role filter UI.
  - Added “Add User” button to open the modal.
  - Debounced search for smoother filtering.
  - Wired `AddStaffModal` and `UserList` together with a refresh key to reload after creation.

### Registration Logic Reused (No new SQL)
- `AddStaffModal` uses the existing `AuthContext` `signUp(email, password, firstName, lastName, role)` which is already integrated with the Supabase trigger-based profile creation or the manual fallback.
- Supported roles here are constrained to `cashier` and `admin` only (as requested).

### Why initial listing showed only current user
- Row Level Security (RLS) typically restricts `SELECT` on `public.user_profiles` to the current user (`auth.uid() = id`). Client-side calls cannot bypass RLS, which is why only the logged-in user appeared.

### RLS: Correct way to allow admins to see all users
Attempting to reference the same table inside its own policy causes Postgres to flag an infinite recursion. The correct pattern is to use a `SECURITY DEFINER` helper function that checks if the current user is an admin, then reference that function in the policy.

Run the following in the Supabase SQL editor (one-time):

```sql
-- Helper: check if current user is admin (bypasses RLS safely)
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.user_profiles
    where id = auth.uid()
      and role = 'admin'
  );
$$;

-- Lock down execution
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

-- Ensure RLS is enabled
alter table public.user_profiles enable row level security;

-- Self policies (view + update own)
drop policy if exists "Users can view own profile" on public.user_profiles;
create policy "Users can view own profile"
on public.user_profiles
for select
using (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.user_profiles;
create policy "Users can update own profile"
on public.user_profiles
for update
using (auth.uid() = id);

-- Admin read/update all
drop policy if exists "Admins can view all profiles" on public.user_profiles;
create policy "Admins can view all profiles"
on public.user_profiles
for select
using (public.is_admin());

drop policy if exists "Admins can update all profiles" on public.user_profiles;
create policy "Admins can update all profiles"
on public.user_profiles
for update
using (public.is_admin());
```

After applying these policies:
- Admins can fetch all rows from `public.user_profiles` via the client.
- Non-admins remain limited to their own profiles.
- Activate/Deactivate (update `is_active`) works for admins.

### How to Use
1. Log in as an admin.
2. Navigate to `/admin/users`.
3. Use search and role filter as needed.
4. Click “Add User” to create `Cashier` or `Administrator` accounts. The modal uses the existing signup method.
5. Use the table action to Activate/Deactivate a user.

### Notes
- No changes were made to the public Register page.
- No new registration SQL was introduced; we reused the existing signup flow.
- If you prefer not to change RLS, you would need a server/edge function that uses the service key to fetch users, but server routes in this project are currently disabled.


