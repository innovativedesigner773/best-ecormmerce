import { createClient } from '@supabase/supabase-js';
import { toast } from 'sonner';

// Utility to manually create the exec_sql function
export async function createExecSqlFunction() {
  const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 
                     process.env.REACT_APP_SUPABASE_URL || 
                     process.env.VITE_SUPABASE_URL ||
                     process.env.SUPABASE_URL;
  
  const serviceRoleKey = import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                        process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || 
                        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                        process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase configuration for exec_sql function creation');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  console.log('🔧 Creating exec_sql function...');

  // First, try to create the function using a direct SQL query
  // This uses Supabase's edge function or direct database access
  try {
    // Try using the built-in SQL editor functionality if available
    const { data, error } = await supabase.rpc('exec', {
      sql: `
        CREATE OR REPLACE FUNCTION exec_sql(sql text)
        RETURNS text AS $$
        BEGIN
          EXECUTE sql;
          RETURN 'Success';
        EXCEPTION
          WHEN OTHERS THEN
            RETURN 'Error: ' || SQLERRM;
        END;
        $$ LANGUAGE plpgsql SECURITY DEFINER;
      `
    });

    if (error) {
      console.log('Direct exec failed, trying alternative method...');
      
      // Alternative: Try using the new Supabase client methods
      const { error: queryError } = await supabase
        .from('information_schema.routines')
        .select('*')
        .limit(1);

      if (queryError) {
        throw new Error('Cannot access database to create exec_sql function');
      }

      // If we can access the database but exec failed, the function might already exist
      // Let's test if exec_sql exists by trying to call it
      const { data: testData, error: testError } = await supabase.rpc('exec_sql', {
        sql: 'SELECT 1 as test;'
      });

      if (testError && testError.message.includes('function exec_sql')) {
        throw new Error('exec_sql function does not exist and cannot be created automatically. Please create it manually in your Supabase SQL editor.');
      }

      console.log('✅ exec_sql function appears to be available');
      return { success: true, message: 'exec_sql function is available' };
    }

    console.log('✅ exec_sql function created successfully');
    return { success: true, message: 'exec_sql function created' };

  } catch (error: any) {
    console.error('❌ Failed to create exec_sql function:', error);
    throw error;
  }
}

// Test if exec_sql function is available
export async function testExecSqlFunction() {
  const supabaseUrl = import.meta.env?.VITE_SUPABASE_URL || 
                     process.env.REACT_APP_SUPABASE_URL || 
                     process.env.VITE_SUPABASE_URL ||
                     process.env.SUPABASE_URL;
  
  const serviceRoleKey = import.meta.env?.VITE_SUPABASE_SERVICE_ROLE_KEY || 
                        process.env.REACT_APP_SUPABASE_SERVICE_ROLE_KEY || 
                        process.env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
                        process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    return { available: false, error: 'Missing Supabase configuration' };
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  try {
    const { data, error } = await supabase.rpc('exec_sql', {
      sql: 'SELECT 1 as test;'
    });

    if (error) {
      return { 
        available: false, 
        error: error.message,
        needsManualSetup: error.message.includes('function exec_sql')
      };
    }

    return { available: true, result: data };
  } catch (error: any) {
    return { 
      available: false, 
      error: error.message,
      needsManualSetup: error.message.includes('function exec_sql')
    };
  }
}

// SQL script that users can run manually in Supabase SQL editor
export const MANUAL_EXEC_SQL_SCRIPT = `
-- Best Brightness Database Setup: exec_sql Function
-- Copy and paste this into your Supabase SQL Editor and run it

CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS text AS $$
BEGIN
  EXECUTE sql;
  RETURN 'Success';
EXCEPTION
  WHEN OTHERS THEN
    RETURN 'Error: ' || SQLERRM;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Test the function
SELECT exec_sql('SELECT 1 as test;') as function_test;
`;

// Instructions for manual setup
export const MANUAL_SETUP_INSTRUCTIONS = `
## Manual Database Setup Instructions

If the automatic setup fails, follow these steps:

### Step 1: Create the exec_sql Function
1. Go to your Supabase dashboard
2. Navigate to the SQL Editor
3. Create a new query and paste the following code:

\`\`\`sql
${MANUAL_EXEC_SQL_SCRIPT}
\`\`\`

4. Run the query - you should see "Success" as the result

### Step 2: Run the Database Setup
Once the exec_sql function is created, return to this page and click "Initialize Database" again.

### Troubleshooting
- Make sure you're using the Service Role Key (not the anon key)
- Ensure your Supabase project has the necessary permissions
- Check that your environment variables are set correctly:
  - VITE_SUPABASE_URL or REACT_APP_SUPABASE_URL
  - VITE_SUPABASE_SERVICE_ROLE_KEY or REACT_APP_SUPABASE_SERVICE_ROLE_KEY
`;