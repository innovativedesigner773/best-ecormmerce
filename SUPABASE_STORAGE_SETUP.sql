-- =====================================================
-- SUPABASE STORAGE BUCKET SETUP FOR BEST BRIGHTNESS
-- =====================================================
-- This script creates the necessary storage buckets and policies
-- for image uploads in the Best Brightness e-commerce platform
-- =====================================================

-- 1. Create the product-images storage bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'product-images',
  'product-images', 
  true,
  5242880, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml']
) ON CONFLICT (id) DO NOTHING;

-- 2. Create RLS policies for the product-images bucket
-- Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'product-images');

-- Allow authenticated users to update their own images
CREATE POLICY "Allow users to update their own product images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Allow authenticated users to delete their own images
CREATE POLICY "Allow users to delete their own product images"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'product-images' AND auth.uid()::text = (storage.foldername(name))[2]);

-- Allow everyone to view product images (public bucket)
CREATE POLICY "Allow public access to product images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- 3. Create a function to automatically organize uploaded images
CREATE OR REPLACE FUNCTION organize_product_image()
RETURNS TRIGGER AS $$
BEGIN
  -- Ensure the path follows the pattern: products/{user_id}/{filename}
  -- This is already handled in the application code, but we can add validation
  IF NEW.bucket_id = 'product-images' THEN
    -- Log the upload for debugging
    RAISE LOG 'Product image uploaded: %', NEW.name;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Create trigger for image organization
DROP TRIGGER IF EXISTS trigger_organize_product_image ON storage.objects;
CREATE TRIGGER trigger_organize_product_image
  AFTER INSERT ON storage.objects
  FOR EACH ROW
  EXECUTE FUNCTION organize_product_image();

-- 5. Grant necessary permissions
GRANT ALL ON storage.objects TO authenticated;
GRANT SELECT ON storage.objects TO anon;

-- 6. Create a view for easy access to product images
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

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================
-- Run these queries to verify the setup:

-- Check if bucket was created:
-- SELECT * FROM storage.buckets WHERE id = 'product-images';

-- Check RLS policies:
-- SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';

-- Check if the view works:
-- SELECT * FROM product_images_view LIMIT 5;
