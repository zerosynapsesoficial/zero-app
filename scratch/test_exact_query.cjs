const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key, {
    auth: { persistSession: false }
});

async function main() {
    console.log("=== Querying exact profiles selector ===");
    const start1 = Date.now();
    const { data: profs, error: err1 } = await supabase
        .from('profiles')
        .select('id, full_name, specialty, price:price_range, phone, address, city')
        .eq('user_type', 'professional');
    const dur1 = Date.now() - start1;
    if (err1) {
        console.error(`❌ Profiles query failed in ${dur1}ms:`, err1.message || err1);
    } else {
        console.log(`✅ Profiles query succeeded in ${dur1}ms! Total profs found:`, profs.length);
    }

    console.log("=== Querying appointments list selector ===");
    const start2 = Date.now();
    const { data: apps, error: err2 } = await supabase
        .from('appointments')
        .select('time')
        .eq('professional_id', 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0')
        .eq('date', '2026-05-20')
        .neq('status', 'cancelled');
    const dur2 = Date.now() - start2;
    if (err2) {
        console.error(`❌ Appointments query failed in ${dur2}ms:`, err2.message || err2);
    } else {
        console.log(`✅ Appointments query succeeded in ${dur2}ms! Bookings:`, apps);
    }
}

main().catch(console.error);
