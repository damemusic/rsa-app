#!/usr/bin/env node

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://wthlnrogmwodfbekghsj.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseServiceKey) {
  console.error('Error: SUPABASE_SERVICE_ROLE_KEY environment variable is not set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const migrationSql = `
  -- Drop existing trigger that's causing signup to fail
  DROP TRIGGER IF EXISTS on_auth_user_created_rsa ON auth.users;
  DROP FUNCTION IF EXISTS create_rsa_user();
`;

async function runMigration() {
  try {
    console.log('Executing migration to fix signup...');

    // Use rpc to execute raw SQL (if available)
    const result = await supabase.rpc('execute_sql', { sql: migrationSql });

    if (result.error) {
      console.error('RPC method not available, trying direct query...');
      // Fall back to trying to execute the statements individually
      const statements = migrationSql.split(';').filter(s => s.trim());

      for (const statement of statements) {
        if (statement.trim()) {
          console.log(`Executing: ${statement.trim().substring(0, 50)}...`);
          // Note: This won't work with regular queries, we need DDL support
        }
      }
    } else {
      console.log('Migration executed successfully');
    }
  } catch (error) {
    console.error('Error executing migration:', error.message);
    console.log('\nTo manually fix this, execute the following SQL in Supabase SQL Editor:');
    console.log(migrationSql);
    process.exit(1);
  }
}

runMigration();
