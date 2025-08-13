// services/supabaseStorage.js
const { supabase } = require('../lib/supabase');
const fs = require('fs');
const path = require('path');

class SupabaseStorageService {
  constructor() {
    this.bucketName = 'announcements';
    // Ensure bucket exists on initialization
    this.initializeBucket();
  }

  // Initialize bucket if it doesn't exist
  async initializeBucket() {
    if (!supabase) return;
    
    try {
      // Check if bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === this.bucketName);
      
      if (!bucketExists) {
        // Create bucket if it doesn't exist
        const { error } = await supabase.storage.createBucket(this.bucketName, {
          public: true,
          allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        });
        
        if (error) {
          console.log('⚠️ Could not create announcements bucket:', error.message);
        } else {
          console.log('✅ Announcements bucket created successfully');
        }
      }
    } catch (error) {
      console.log('⚠️ Error initializing bucket:', error.message);
    }
  }

  // Upload banner to Supabase storage
  async uploadBanner(file, announcementId) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const fileName = `announcement-${announcementId}-${Date.now()}${fileExt}`;
      const filePath = `banners/${fileName}`;

      // Read file buffer
      const fileBuffer = fs.readFileSync(file.path);

      // Upload to Supabase storage
      const { data, error } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, fileBuffer, {
          contentType: file.mimetype,
          upsert: false
        });

      if (error) {
        console.error('❌ Supabase upload error:', error);
        throw error;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      // Clean up local file
      if (fs.existsSync(file.path)) {
        fs.unlinkSync(file.path);
      }

      console.log(`✅ Banner uploaded to Supabase: ${filePath}`);
      return {
        url: urlData.publicUrl,
        path: filePath,
        originalName: file.originalname,
        size: file.size
      };
    } catch (error) {
      console.error('❌ Failed to upload banner to Supabase:', error);
      throw error;
    }
  }

  // Delete banner from Supabase storage
  async deleteBanner(filePath) {
    if (!supabase || !filePath) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Failed to delete banner from Supabase:', error);
      } else {
        console.log(`✅ Banner deleted from Supabase: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ Error deleting banner from Supabase:', error);
    }
  }

  // Check if Supabase is available
  isAvailable() {
    return !!supabase;
  }
}

module.exports = new SupabaseStorageService();
