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
 * 
 * Note: If credentials are missing, the client will return null and operations will fail gracefully.
 * Unlike Azure services which have mock mode, Supabase is required for core functionality.
 */

const SUPABASE_MOCK_MODE = !process.env.SUPABASE_URL || !process.env.SUPABASE_KEY;
let supabaseClient: SupabaseClient | null = null;
let initializationAttempted = false;

export const isSupabaseMockMode = (): boolean => SUPABASE_MOCK_MODE;

/**
 * Get Supabase client
 * Returns null if credentials are missing (allows server to start)
 * For model operations, use requireSupabaseClient() which throws a clear error
 */
export const getSupabaseClient = (): SupabaseClient | null => {
  if (supabaseClient) {
    return supabaseClient;
  }

  if (SUPABASE_MOCK_MODE) {
    if (!initializationAttempted) {
      console.warn('⚠️  Supabase credentials not found. Please add SUPABASE_URL and SUPABASE_KEY to your .env file.');
      console.warn('   Database operations will fail. Supabase is required for core functionality.');
      initializationAttempted = true;
    }
    return null;
  }

  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseKey = process.env.SUPABASE_KEY!;

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey);
    if (!initializationAttempted) {
      console.log('✅ Supabase client initialized successfully');
      initializationAttempted = true;
    }
    return supabaseClient;
  } catch (error) {
    console.error('Failed to initialize Supabase client:', error);
    initializationAttempted = true;
    return null;
  }
};

/**
 * Get Supabase client or throw error if not configured
 * Use this in model operations where Supabase is required
 */
export const requireSupabaseClient = (): SupabaseClient => {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error(
      'Supabase is not configured. Please add SUPABASE_URL and SUPABASE_KEY to your .env file.\n' +
      'Database operations cannot proceed without Supabase credentials.'
    );
  }
  return client;
};

export const testSupabaseConnection = async (): Promise<boolean> => {
  if (SUPABASE_MOCK_MODE) {
    console.warn('⚠️  Supabase connection test skipped: credentials not configured');
    return false;
  }

  try {
    const client = getSupabaseClient();
    if (!client) {
      console.error('Supabase connection test failed: client is null');
      return false;
    }

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

