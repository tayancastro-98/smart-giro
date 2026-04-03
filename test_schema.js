import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  const { data, error } = await supabase.from('categories').select('*').limit(5);
  console.log('Categories:', data?.[0]);
  const { data: cat7 } = await supabase.from('categories').select('*, tournament:tournaments(name)').eq('id', '61a9ea24-fb00-403b-bb64-82ee70ef98b0').single();
  console.log('Category with best_of 7:', cat7);
}

main();
