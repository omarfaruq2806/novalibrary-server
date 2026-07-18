import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

async function testSupabase() {
  const supabaseUrl = process.env.SUPABASE_URL!;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  console.log('Connecting to Supabase at:', supabaseUrl);
  
  if (!supabaseUrl || !supabaseServiceRoleKey) {
    console.error('Error: SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY is missing in env!');
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      console.error('Error listing buckets:', error);
    } else {
      console.log('Buckets list:');
      buckets.forEach(b => console.log(` - ID: "${b.id}", Name: "${b.name}", Public: ${b.public}`));
    }
  } catch (err) {
    console.error('Catch error:', err);
  }
}
testSupabase();
