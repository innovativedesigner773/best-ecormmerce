-- =====================================================
-- FIX STORAGE BUCKET SETUP - HANDLES EXISTING POLICIES
-- =====================================================
-- This script fixes the storage bucket setup when policies already exist
-- =====================================================

-- Step 1: Check if bucket exists, create if it doesn't
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];

-- Step 2: Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Allow authenticated users to upload product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own product images" ON storage.objects;
DROP POLICY IF EXISTS "Allow public access to product images" ON storage.objects;

-- Step 3: Create the policies fresh
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Allow users to update their own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Allow users to delete their own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[2]);

CREATE POLICY "Allow public access to product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Step 4: Ensure permissions are correct
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- Step 5: Create/update the view
CREATE OR REPLACE VIEW product_images_view AS
SELECT 
  name as image_path,
  bucket_id,
  created_at,
  updated_at,
  (storage.foldername(name))[2] as user_id,
  (storage.foldername(name))[3] as filename
FROM storage.objects
WHERE bucket_id = 'product-images';

-- Grant access to the view
GRANT SELECT ON product_images_view TO authenticated;
GRANT SELECT ON product_images_view TO anon;

-- Step 6: Verify the setup
SELECT 'Bucket setup complete!' as status;
SELECT id, name, public, file_size_limit FROM storage.buckets WHERE id = 'product-images';
SELECT count(*) as policy_count FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
