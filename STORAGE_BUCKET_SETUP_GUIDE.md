# 🖼️ Supabase Storage Bucket Setup Guide

## 🚨 Problem Solved
Your application is failing to upload product images because the `product-images` storage bucket doesn't exist in your Supabase project.

## ✅ Quick Fix Steps

### Step 1: Create Storage Bucket via Supabase Dashboard

1. **Go to your Supabase Dashboard**
   - Visit: https://supabase.com/dashboard/project/yusvpxltvvlhubwqeuzi
   - Navigate to **Storage** in the left sidebar

2. **Create New Bucket**
   - Click **"New bucket"**
   - **Name**: `product-images`
   - **Public bucket**: ✅ **Enable this** (important!)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: `image/jpeg,image/png,image/gif,image/webp,image/svg+xml`
   - Click **"Create bucket"**

### Step 2: Set Up RLS Policies

1. **Go to SQL Editor**
   - In your Supabase dashboard, go to **SQL Editor**
   - Create a new query

2. **Run the Setup Script**
   - Copy and paste the entire contents of `SUPABASE_STORAGE_SETUP.sql`
   - Click **"Run"** to execute the script

### Step 3: Verify Setup

Run these verification queries in the SQL Editor:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE id = 'product-images';

-- Check RLS policies
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';
```

## 🔧 Alternative: Manual Setup via SQL

If you prefer to run individual commands, execute these in order:

```sql
-- 1. Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
);

-- 2. Create RLS policies
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow public access to product images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'product-images');
```

## 🎯 What This Fixes

### Before Fix:
```
❌ StorageApiError: Bucket not found
❌ Image upload failed: Ensure the "product-images" bucket exists and is public
❌ Images can't be uploaded or links
```

### After Fix:
```
✅ Product images upload successfully
✅ Images display correctly in product management
✅ Public URLs work for product images
✅ Admin can add/edit product images
```

## 🧪 Testing the Fix

1. **Go to Product Management**
   - Navigate to `/admin/products` in your app
   - Try uploading an image when creating/editing a product

2. **Check Console**
   - Open browser developer tools
   - Look for successful upload messages instead of errors

3. **Verify Image Display**
   - Uploaded images should appear in the product list
   - Images should be accessible via public URLs

## 🔒 Security Features

The setup includes:
- ✅ **Public bucket**: Images are publicly accessible (needed for product display)
- ✅ **Size limits**: 5MB max file size
- ✅ **MIME type restrictions**: Only image files allowed
- ✅ **User isolation**: Users can only modify their own uploads
- ✅ **RLS policies**: Proper row-level security

## 🚀 Advanced Configuration

### Custom Bucket Settings
You can modify the bucket settings by updating the bucket:

```sql
UPDATE storage.buckets 
SET 
  file_size_limit = 10485760, -- 10MB
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'product-images';
```

### Adding Watermark Function
For production, consider adding automatic watermarking:

```sql
-- This would require a custom Edge Function
-- See: https://supabase.com/docs/guides/storage/image-transformations
```

## 🆘 Troubleshooting

### Issue: "Bucket already exists"
**Solution**: The bucket might already exist. Check with:
```sql
SELECT * FROM storage.buckets WHERE id = 'product-images';
```

### Issue: "Permission denied"
**Solution**: Make sure you're logged in as a project owner or have admin privileges.

### Issue: "Images still not uploading"
**Solution**: 
1. Clear browser cache
2. Check browser console for new error messages
3. Verify the bucket is marked as **public**

### Issue: "RLS policies not working"
**Solution**: Run the verification queries to check if policies were created correctly.

## 📞 Support

If you continue to have issues:
1. Check the Supabase project logs
2. Verify your project ID matches: `yusvpxltvvlhubwqeuzi`
3. Ensure you have the correct permissions

---

**🎉 Once completed, your product image uploads will work perfectly!**
