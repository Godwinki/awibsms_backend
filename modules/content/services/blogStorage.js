// services/blogStorage.js
const { supabase } = require('../../../core/lib/supabase');
const fs = require('fs');
const path = require('path');

class BlogStorageService {
  constructor() {
    this.bucketName = 'blogs';
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
          console.log('⚠️ Could not create blogs bucket:', error.message);
        } else {
          console.log('✅ Blogs bucket created successfully');
        }
      }
    } catch (error) {
      console.log('⚠️ Error initializing blog bucket:', error.message);
    }
  }

  // Upload featured image to Supabase storage
  async uploadFeaturedImage(file, blogId) {
    if (!supabase) {
      throw new Error('Supabase not configured');
    }

    try {
      // Generate unique filename
      const fileExt = path.extname(file.originalname);
      const fileName = `blog-${blogId}-${Date.now()}${fileExt}`;
      const filePath = `featured-images/${fileName}`;

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

      console.log(`✅ Featured image uploaded to Supabase: ${filePath}`);
      return {
        url: urlData.publicUrl,
        path: filePath,
        originalName: file.originalname,
        size: file.size
      };
    } catch (error) {
      console.error('❌ Failed to upload featured image to Supabase:', error);
      throw error;
    }
  }

  // Upload multiple images to Supabase storage
  async uploadMultipleImages(files, blogId) {
    if (!supabase || !files || files.length === 0) {
      return [];
    }

    const uploadPromises = files.map(async (file, index) => {
      try {
        // Generate unique filename
        const fileExt = path.extname(file.originalname);
        const fileName = `blog-${blogId}-image-${index + 1}-${Date.now()}${fileExt}`;
        const filePath = `gallery/${fileName}`;

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
          console.error('❌ Supabase upload error for image:', error);
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

        console.log(`✅ Image uploaded to Supabase: ${filePath}`);
        return {
          url: urlData.publicUrl,
          path: filePath,
          originalName: file.originalname,
          size: file.size,
          order: index
        };
      } catch (error) {
        console.error('❌ Failed to upload image to Supabase:', error);
        // Clean up local file even if upload failed
        if (fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
        }
        return null;
      }
    });

    const results = await Promise.all(uploadPromises);
    return results.filter(result => result !== null);
  }

  // Delete featured image from Supabase storage
  async deleteFeaturedImage(filePath) {
    if (!supabase || !filePath) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (error) {
        console.error('❌ Failed to delete featured image from Supabase:', error);
      } else {
        console.log(`✅ Featured image deleted from Supabase: ${filePath}`);
      }
    } catch (error) {
      console.error('❌ Error deleting featured image from Supabase:', error);
    }
  }

  // Delete multiple images from Supabase storage
  async deleteMultipleImages(imagePaths) {
    if (!supabase || !imagePaths || imagePaths.length === 0) {
      return;
    }

    try {
      const { error } = await supabase.storage
        .from(this.bucketName)
        .remove(imagePaths);

      if (error) {
        console.error('❌ Failed to delete images from Supabase:', error);
      } else {
        console.log(`✅ ${imagePaths.length} images deleted from Supabase`);
      }
    } catch (error) {
      console.error('❌ Error deleting images from Supabase:', error);
    }
  }

  // Check if Supabase is available
  isAvailable() {
    return !!supabase;
  }
}

module.exports = new BlogStorageService();
