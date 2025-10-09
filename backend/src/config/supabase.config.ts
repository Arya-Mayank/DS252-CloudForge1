import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Configuration
 * 
 * Setup Instructions:
 * 1. Go to https://supabase.com and create a new project
 * 2. Wait for the database to be provisioned
 * 3. Go to Settings > API
 * 4. Copy the Project URL and anon/public key to .env
 * 5. Run the schema.sql file in the SQL Editor to create tables
 * 
 * Environment Variables Required:
 * - SUPABASE_URL: Your project URL
 * - SUPABASE_KEY: Your anon/public API key
 */

let supabaseClient: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient => {
  if (supabaseClient) {
    return supabaseClient;
  }

  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    throw new Error(
      'Supabase credentials not found. Please add SUPABASE_URL and SUPABASE_KEY to your .env file.'
    );
  }

  supabaseClient = createClient(supabaseUrl, supabaseKey);
  console.log('✅ Supabase client initialized successfully');
  
  return supabaseClient;
};

export const testSupabaseConnection = async (): Promise<boolean> => {
  try {
    const client = getSupabaseClient();
    const { error } = await client.from('users').select('count').limit(1);
    
    if (error && error.code !== 'PGRST116') { // PGRST116 means table exists but is empty
      console.error('Supabase connection test failed:', error);
      return false;
    }
    
    console.log('✅ Supabase connection test successful');
    return true;
  } catch (error) {
    console.error('Supabase connection test failed:', error);
    return false;
  }
};

