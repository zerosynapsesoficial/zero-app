import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://oryguljbqcphbtiapvwk.supabase.co',
  'sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5'
);

async function findEmail() {
  const { data, error } = await supabase.from('profiles').select('id, full_name, user_type').eq('id', '54e8ecf2-95f0-466d-9be2-475a898b9e69');
  console.log('Profile:', data);
  // We can't see auth.users directly from anon key usually.
}

findEmail();
