const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key, {
    auth: { persistSession: false }
});

async function main() {
    console.log("=== Testing Connection to Supabase ===");
    const start = Date.now();
    try {
        const { data, error } = await supabase.from('profiles').select('id').limit(1);
        const duration = Date.now() - start;
        if (error) {
            console.error(`❌ Connection failed in ${duration}ms:`, error.message);
        } else {
            console.log(`✅ Connection succeeded in ${duration}ms! Data:`, data);
        }
    } catch (e) {
        console.error("❌ Exception during connection:", e);
    }
}

main().catch(console.error);
