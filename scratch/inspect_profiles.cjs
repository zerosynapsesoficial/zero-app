const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function inspectProfiles() {
    console.log("=== Inspecting profiles table ===");
    const { data, error } = await supabase.from('profiles').select('*').limit(1);
    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("Successfully fetched 1 row. Columns present:");
        if (data && data.length > 0) {
            console.log(Object.keys(data[0]));
            console.log("Row data:", data[0]);
        } else {
            console.log("Table is empty, but query succeeded.");
        }
    }
}

inspectProfiles().catch(console.error);
