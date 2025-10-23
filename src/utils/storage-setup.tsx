import { supabase } from './supabase/client';

export interface StorageBucket {
  id: string;
  name: string;
  public: boolean;
  file_size_limit: number;
  allowed_mime_types: string[];
}

export class StorageSetup {
  /**
   * Check if a storage bucket exists
   */
  static async checkBucketExists(bucketId: string): Promise<boolean> {
    try {
      // Use the storage API to list buckets and check if our bucket exists
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.error('Error listing buckets:', error);
        return false;
      }
      
      return data?.some(bucket => bucket.id === bucketId) || false;
    } catch (error) {
      console.error('Error checking bucket existence:', error);
      return false;
    }
  }

  /**
   * Get bucket information
   */
  static async getBucketInfo(bucketId: string): Promise<StorageBucket | null> {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error || !data) return null;
      
      const bucket = data.find(b => b.id === bucketId);
      if (!bucket) return null;
      
      return {
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types || []
      };
    } catch (error) {
      console.error('Error getting bucket info:', error);
      return null;
    }
  }

  /**
   * Test image upload to verify bucket setup
   */
  static async testImageUpload(bucketId: string): Promise<{ success: boolean; error?: string }> {
    try {
      // Create a small test image (1x1 pixel PNG)
      const canvas = document.createElement('canvas');
      canvas.width = 1;
      canvas.height = 1;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas context not available');
      
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 1, 1);
      
      const blob = await new Promise<Blob>((resolve) => {
        canvas.toBlob((blob) => {
          resolve(blob!);
        }, 'image/png');
      });
      
      const testPath = `test/${Date.now()}-test.png`;
      
      const { error: uploadError } = await supabase.storage
        .from(bucketId)
        .upload(testPath, blob, { upsert: false });
      
      if (uploadError) {
        return { success: false, error: uploadError.message };
      }
      
      // Clean up test file
      await supabase.storage.from(bucketId).remove([testPath]);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Get all available storage buckets
   */
  static async getAllBuckets(): Promise<StorageBucket[]> {
    try {
      const { data, error } = await supabase.storage.listBuckets();
      
      if (error || !data) return [];
      
      return data.map(bucket => ({
        id: bucket.id,
        name: bucket.name,
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: bucket.allowed_mime_types || []
      }));
    } catch (error) {
      console.error('Error getting buckets:', error);
      return [];
    }
  }

  /**
   * Comprehensive storage health check
   */
  static async healthCheck(): Promise<{
    bucketExists: boolean;
    bucketInfo: StorageBucket | null;
    uploadTest: { success: boolean; error?: string };
    allBuckets: StorageBucket[];
  }> {
    const BUCKET_ID = 'product-images';
    
    const [bucketExists, bucketInfo, uploadTest, allBuckets] = await Promise.all([
      this.checkBucketExists(BUCKET_ID),
      this.getBucketInfo(BUCKET_ID),
      this.testImageUpload(BUCKET_ID),
      this.getAllBuckets()
    ]);
    
    return {
      bucketExists,
      bucketInfo,
      uploadTest,
      allBuckets
    };
  }

  /**
   * Display storage status in console
   */
  static async logStorageStatus(): Promise<void> {
    console.group('🖼️ Storage Status Check');
    
    const health = await this.healthCheck();
    
    console.log('📦 Bucket exists:', health.bucketExists ? '✅ Yes' : '❌ No');
    
    if (health.bucketInfo) {
      console.log('📋 Bucket info:', {
        id: health.bucketInfo.id,
        public: health.bucketInfo.public ? '✅ Yes' : '❌ No',
        sizeLimit: `${(health.bucketInfo.file_size_limit / 1024 / 1024).toFixed(1)}MB`,
        allowedTypes: health.bucketInfo.allowed_mime_types.join(', ')
      });
    }
    
    console.log('🧪 Upload test:', health.uploadTest.success ? '✅ Passed' : `❌ Failed: ${health.uploadTest.error}`);
    
    console.log('📁 All buckets:', health.allBuckets.map(b => b.id));
    
    if (!health.bucketExists) {
      console.warn('⚠️  Storage bucket "product-images" not found!');
      console.warn('📖 See STORAGE_BUCKET_SETUP_GUIDE.md for setup instructions');
    }
    
    console.groupEnd();
  }
}

// Auto-run storage check in development
if (import.meta.env.DEV) {
  // Run after a short delay to ensure Supabase is initialized
  setTimeout(() => {
    StorageSetup.logStorageStatus();
  }, 1000);
}
