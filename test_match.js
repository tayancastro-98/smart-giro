import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function testMatch() {
  const cat7 = await supabase.from('categories').select('*').eq('id', '61a9ea24-fb00-403b-bb64-82ee70ef98b0').single();
  console.log('Category 7 best_of:', cat7.data.best_of);

  const mInsert = await supabase.from('matches').insert([{
     category_id: cat7.data.id,
     phase: 1,
     match_number: 999,
     best_of: cat7.data.best_of,
     status: 'TEST'
  }]).select();
  console.log('Inserted Match:', mInsert.data);
  
  await supabase.from('matches').delete().eq('status', 'TEST');
}
testMatch();
