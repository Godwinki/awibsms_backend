// scripts/setup-supabase-storage.js
require('dotenv').config();
const { supabase } = require('../lib/supabase');

async function setupSupabaseStorage() {
  if (!supabase) {
    console.log('⚠️ Supabase not configured. Skipping storage setup.');
    return;
  }

  try {
    console.log('🔧 Setting up Supabase storage...');

    // Check if the public-documents bucket exists
    const { data: buckets, error: listError } = await supabase.storage.listBuckets();
    
    if (listError) {
      console.log('❌ Error listing buckets:', listError);
      return;
    }

    const publicDocsBucket = buckets.find(bucket => bucket.name === 'public-documents');
    
    if (!publicDocsBucket) {
      console.log('📦 Creating public-documents bucket...');
      
      const { data, error } = await supabase.storage.createBucket('public-documents', {
        public: true,
        allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
        fileSizeLimit: 10485760 // 10MB
      });

      if (error) {
        console.log('❌ Error creating bucket:', error);
      } else {
        console.log('✅ public-documents bucket created successfully');
      }
    } else {
      console.log('✅ public-documents bucket already exists');
    }

    // Set up RLS policy for public access
    console.log('🔐 Setting up storage policies...');
    
    // Note: You may need to run these SQL commands in Supabase dashboard:
    console.log(`
📋 Run these SQL commands in your Supabase dashboard if needed:

-- Allow public read access to public-documents bucket
CREATE POLICY "Public Access" ON storage.objects FOR SELECT USING (bucket_id = 'public-documents');

-- Allow authenticated users to upload to public-documents bucket  
CREATE POLICY "Authenticated Upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'public-documents' AND auth.role() = 'authenticated');

-- Allow authenticated users to update files in public-documents bucket
CREATE POLICY "Authenticated Update" ON storage.objects FOR UPDATE USING (bucket_id = 'public-documents' AND auth.role() = 'authenticated');
    `);

  } catch (error) {
    console.log('❌ Error setting up Supabase storage:', error);
  }
}

// Run if called directly
if (require.main === module) {
  setupSupabaseStorage().then(() => {
    console.log('🎉 Storage setup complete');
    process.exit(0);
  }).catch(error => {
    console.log('❌ Storage setup failed:', error);
    process.exit(1);
  });
}

module.exports = setupSupabaseStorage;
