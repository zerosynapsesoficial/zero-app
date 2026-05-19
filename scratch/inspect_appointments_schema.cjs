const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key, {
    auth: { persistSession: false }
});

async function main() {
    console.log("=== Querying a single record from public.appointments using anon key ===");
    
    const { data, error } = await supabase.from('appointments').select('*').limit(1);
    if (error) {
        console.error("❌ Error querying appointments table:", error.message || error);
    } else {
        console.log("✅ Successfully queried appointments table!");
        console.log("Sample record or columns:", data);
    }
}

main().catch(console.error);
