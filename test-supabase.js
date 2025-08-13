// Test Supabase connection and storage
const { supabase } = require('./lib/supabase');

async function testSupabase() {
  console.log('🧪 Testing Supabase connection...');
  
  if (!supabase) {
    console.log('❌ Supabase not configured');
    return;
  }
  
  try {
    // Test storage connection
    const { data: buckets, error } = await supabase.storage.listBuckets();
    
    if (error) {
      console.log('❌ Error listing buckets:', error);
      return;
    }
    
    console.log('✅ Supabase connected successfully');
    console.log('📦 Available buckets:', buckets?.map(b => b.name));
    
    // Test getting public URL
    const testPath = 'banners/test-file.jpg';
    const { data: urlData } = supabase.storage
      .from('announcements')
      .getPublicUrl(testPath);
    
    console.log('🔗 Test public URL:', urlData.publicUrl);
    
  } catch (error) {
    console.log('❌ Supabase test failed:', error.message);
  }
}

testSupabase();
