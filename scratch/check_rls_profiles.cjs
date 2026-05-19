const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key, {
    auth: { persistSession: false }
});

async function main() {
    console.log("=== Querying RLS policies for profiles and appointments ===");
    
    // We can query pg_policies using an RPC if available, or do a direct RPC to get policies.
    // Let's see if we can read pg_policies by running a query or checking if RLS is causing slow queries on profiles.
    const start = Date.now();
    const { data, error } = await supabase.from('profiles').select('id, user_type').limit(5);
    const duration = Date.now() - start;
    if (error) {
        console.error(`❌ Profiles query failed in ${duration}ms:`, error.message);
    } else {
        console.log(`✅ Profiles query succeeded in ${duration}ms! Data:`, data);
    }
}

main().catch(console.error);
