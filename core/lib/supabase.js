// lib/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration for storage
const getSupabaseConfig = () => {
  // Supabase project configuration
  const projectUrl = process.env.SUPABASE_URL;
  
  // Use the service role key for backend operations (full access)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (projectUrl && serviceRoleKey) {
    return {
      url: projectUrl,
      key: serviceRoleKey
    };
  }
  
  return null;
};

const config = getSupabaseConfig();

let supabase = null;
if (config && config.url && config.key) {
  try {
    supabase = createClient(config.url, config.key);
    console.log('✅ Supabase client initialized for storage');
  } catch (error) {
    console.log('⚠️ Supabase initialization failed - using local file storage:', error.message);
    supabase = null;
  }
} else {
  console.log('⚠️ Supabase not configured - using local file storage');
}

module.exports = { supabase };
