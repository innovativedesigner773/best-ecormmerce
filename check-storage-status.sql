-- Quick diagnostic to check storage bucket status
-- Run this first to see what's missing

-- Check if bucket exists
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-images') 
    THEN '✅ Bucket exists' 
    ELSE '❌ Bucket missing' 
  END as bucket_status,
  id, name, public, file_size_limit, allowed_mime_types
FROM storage.buckets 
WHERE id = 'product-images';

-- Check existing policies
SELECT 
  'Policies found:' as info,
  policyname, cmd, roles
FROM pg_policies 
WHERE tablename = 'objects' 
  AND schemaname = 'storage' 
  AND policyname LIKE '%product%';

-- Check if bucket is accessible
SELECT 
  CASE 
    WHEN EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-images' AND public = true)
    THEN '✅ Bucket is public' 
    ELSE '❌ Bucket is private' 
  END as public_status;
