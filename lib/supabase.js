// lib/supabase.js
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration for storage
const getSupabaseConfig = () => {
  // Supabase project configuration
  const projectUrl = 'https://pgunreiclvavgwsfhbrd.supabase.co';
  
  // Use the service role key for backend operations (full access)
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBndW5yZWljbHZhdmd3c2ZoYnJkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzA4OTA0MiwiZXhwIjoyMDY4NjY1MDQyfQ.3fWpltlf5GjDzkCHP0Nt3aZA72GwpexTnV8a2lFQJIk';
  
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
