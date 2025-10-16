-- Verification queries to check if the bucket was created successfully
-- Run these in your Supabase SQL Editor after creating the bucket

-- 1. Check if the bucket exists
SELECT * FROM storage.buckets WHERE id = 'product-images';

-- 2. Check if the bucket is public
SELECT id, name, public, file_size_limit, allowed_mime_types 
FROM storage.buckets 
WHERE id = 'product-images';

-- 3. Check RLS policies
SELECT policyname, cmd, roles, qual, with_check 
FROM pg_policies 
WHERE tablename = 'objects' AND schemaname = 'storage';

-- 4. Test bucket access (this should return the bucket info)
SELECT bucket_id, count(*) as file_count 
FROM storage.objects 
WHERE bucket_id = 'product-images' 
GROUP BY bucket_id;
