// scripts/test-storage.js
require('dotenv').config();
const { supabase } = require('../lib/supabase');

async function testStorage() {
  console.log('🧪 Testing storage system...');
  
  // Check environment
  const isProduction = process.env.NODE_ENV === 'production';
  const useSupabase = supabase && (isProduction || process.env.USE_SUPABASE_STORAGE === 'true');
  
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Supabase available: ${!!supabase}`);
  console.log(`Will use Supabase: ${useSupabase}`);
  
  if (supabase) {
    try {
      // Test bucket access
      const { data: buckets, error } = await supabase.storage.listBuckets();
      
      if (error) {
        console.log('❌ Error accessing Supabase storage:', error);
      } else {
        console.log('✅ Supabase storage accessible');
        console.log('📦 Available buckets:', buckets.map(b => b.name));
        
        // Check if public-documents bucket exists
        const publicDocsBucket = buckets.find(b => b.name === 'public-documents');
        if (publicDocsBucket) {
          console.log('✅ public-documents bucket found');
        } else {
          console.log('⚠️ public-documents bucket not found');
        }
      }
    } catch (error) {
      console.log('❌ Error testing Supabase:', error);
    }
  }
  
  console.log('🎉 Storage test complete');
}

if (require.main === module) {
  testStorage().then(() => process.exit(0)).catch(error => {
    console.log('❌ Test failed:', error);
    process.exit(1);
  });
}

module.exports = testStorage;
