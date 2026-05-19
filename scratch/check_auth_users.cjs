const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
// Using service_role key to access auth.users directly
const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!serviceKey) {
    console.error("❌ SUPABASE_SERVICE_KEY não definida.");
    console.error("Execute: set SUPABASE_SERVICE_KEY=sua_service_key && node scratch/check_auth_users.cjs");
    process.exit(1);
}

const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false }
});

async function checkAuthUsers() {
    console.log("=== Checking auth.users table via service key ===\n");

    // Query via RPC since auth.users is not directly accessible via JS client
    const { data, error } = await supabase.rpc('get_auth_users_info');
    
    if (error) {
        console.log("❌ RPC failed:", error.message);
        // Try direct REST query
        const resp = await fetch(`${url}/rest/v1/rpc/get_auth_users_info`, {
            headers: {
                'apikey': serviceKey,
                'Authorization': `Bearer ${serviceKey}`
            }
        });
        console.log("REST status:", resp.status, await resp.text());
    } else {
        console.log("Users:", JSON.stringify(data, null, 2));
    }
}

checkAuthUsers().catch(console.error);
