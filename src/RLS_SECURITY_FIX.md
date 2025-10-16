# RLS Security Fix - Enable Row Level Security

The Supabase database linter has identified critical security issues where Row Level Security (RLS) policies exist but RLS is not enabled on the tables. This means your security policies are **not being enforced**.

## 🚨 Critical Security Issue

**Problem**: Tables have RLS policies but RLS is disabled, meaning anyone can access all data regardless of policies.

**Impact**: 
- User profiles can be viewed by anyone
- Orders can be accessed by unauthorized users  
- Admin-only data is publicly accessible
- Cart items and favourites are not protected

## ✅ Quick Fix - Run This SQL Script

Copy and paste this script into your **Supabase SQL Editor** and run it immediately:

```sql
-- ============================================
-- ENABLE ROW LEVEL SECURITY ON ALL TABLES
-- ============================================

-- Enable RLS on all tables that have policies but RLS disabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE favourites ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;
ALTER TABLE promotion_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE barcode_scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Verify RLS is enabled on all tables
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    CASE 
        WHEN rowsecurity THEN '✅ ENABLED' 
        ELSE '❌ DISABLED' 
    END as status
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN (
    'user_profiles', 'categories', 'products', 'inventory',
    'orders', 'order_items', 'cart_items', 'favourites',
    'promotions', 'promotion_products', 'barcode_scans', 'audit_logs'
)
ORDER BY tablename;
```

## 🔍 Verification

After running the script, you should see all tables showing `✅ ENABLED` in the status column.

## 🛡️ What This Fixes

### Before (INSECURE):
- ❌ Anyone could view all user profiles
- ❌ Anyone could access all orders  
- ❌ Anyone could see all cart items
- ❌ Admin data was publicly accessible
- ❌ Inventory data was unprotected

### After (SECURE):
- ✅ Users can only see their own profiles
- ✅ Users can only access their own orders
- ✅ Cart items are user-specific
- ✅ Admin data requires proper permissions
- ✅ Role-based access control enforced

## 📋 Security Policies Summary

Once RLS is enabled, these policies will be enforced:

### **User Profiles**
- Users can view/update their own profile only
- Staff+ can view all profiles
- Admin/Manager can manage all profiles

### **Products & Categories**  
- Public read access for active items
- Staff+ can manage products and categories

### **Orders & Order Items**
- Users can only see their own orders
- Staff+ can view and manage all orders
- Cashiers can process orders

### **Cart & Favourites**
- User-specific access only
- Guest cart support via session ID

### **Inventory**
- Staff+ can view inventory levels
- Staff+ can manage stock

### **Promotions**
- Public read access for active promotions
- Manager+ can create/manage promotions

### **Barcode Scans & Audit Logs**
- Staff+ can view barcode scans
- Admin-only access to audit logs

## 🚨 Run This Fix Immediately

**This is a critical security vulnerability.** Run the SQL script above in your Supabase dashboard **right now** to secure your application.

### Steps:
1. **Open Supabase Dashboard** → Your project
2. **Go to SQL Editor** 
3. **Paste the SQL script** above
4. **Click "Run"**
5. **Verify** all tables show "✅ ENABLED"

## 🧪 Test After Fix

After enabling RLS, test these scenarios:

1. **User Registration** - Should still work
2. **User Login** - Should still work  
3. **Product Browsing** - Should still work (public access)
4. **User Profile Access** - Should only show own profile
5. **Admin Access** - Should work with proper role

## 🔧 If You Get Errors

If you encounter any errors after enabling RLS:

### Error: "Row-level security policy violation"
**Cause**: Missing policy for a specific operation
**Fix**: Check that all required policies exist

### Error: "Permission denied" 
**Cause**: Policy logic needs adjustment
**Fix**: Review policy conditions in your SQL Editor

### Error: "New row violates row-level security"
**Cause**: INSERT policies missing or too restrictive  
**Fix**: Ensure INSERT policies allow legitimate operations

## 📊 Monitor Security Status

Add this query to your monitoring dashboard:

```sql
-- Check RLS status across all tables
SELECT 
    t.schemaname,
    t.tablename,
    t.rowsecurity as rls_enabled,
    COUNT(p.policyname) as policy_count,
    CASE 
        WHEN t.rowsecurity AND COUNT(p.policyname) > 0 THEN '✅ SECURE'
        WHEN t.rowsecurity AND COUNT(p.policyname) = 0 THEN '⚠️ RLS ON, NO POLICIES'
        WHEN NOT t.rowsecurity AND COUNT(p.policyname) > 0 THEN '❌ POLICIES EXIST, RLS OFF'  
        ELSE '❌ NO SECURITY'
    END as security_status
FROM pg_tables t
LEFT JOIN pg_policies p ON t.tablename = p.tablename AND t.schemaname = p.schemaname
WHERE t.schemaname = 'public'
GROUP BY t.schemaname, t.tablename, t.rowsecurity
ORDER BY t.tablename;
```

## 🎯 Expected Results After Fix

Your application should:
- ✅ Pass all Supabase linter security checks
- ✅ Enforce proper role-based access control  
- ✅ Protect user data appropriately
- ✅ Allow legitimate operations to continue working
- ✅ Block unauthorized access attempts

**Remember**: This fix is mandatory for production use. Never deploy an application with RLS disabled on tables containing sensitive data.