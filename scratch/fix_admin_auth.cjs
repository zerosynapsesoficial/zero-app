const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function fixAdminAuth() {
    console.log("=== Step 1: Check current auth state ===");
    
    // First, try to list all known user IDs from profiles
    const { data: admins } = await supabase.from('profiles').select('id, full_name, user_type').eq('user_type', 'admin');
    console.log("Admin profiles:", admins);

    // Try signup (will tell us if the email exists)
    console.log("\n=== Step 2: Try signUp for admin@zerosynapses.com ===");
    const { data: signUpData, error: signUpErr } = await supabase.auth.signUp({
        email: 'admin@zerosynapses.com',
        password: 'ZP@147896325@ZP',
        options: {
            data: {
                full_name: 'ZeroZynapses',
                user_type: 'admin'
            }
        }
    });

    if (signUpErr) {
        console.error("SignUp error:", signUpErr.message);
    } else {
        console.log("SignUp result:");
        console.log("  User ID:", signUpData.user?.id);
        console.log("  Email:", signUpData.user?.email);
        console.log("  Confirmed:", signUpData.user?.email_confirmed_at ? "YES" : "NO");
        console.log("  Session:", signUpData.session ? "YES" : "NO");
        
        if (signUpData.user?.identities?.length === 0) {
            console.log("  -> User already exists (email taken) but NOT confirmed!");
        }
    }

    // Also check if Anderson can login
    console.log("\n=== Step 3: Check Anderson profile auth ===");
    const { data: profiles } = await supabase.from('profiles').select('*').eq('id', '98ad1dc6-4d36-4850-8979-55a75bcb9776');
    console.log("Anderson profile:", profiles?.[0]);

    // Try login with the ZeroZynapses ID directly
    console.log("\n=== Step 4: Test if we can get a session after signUp ===");
    const { data: retryData, error: retryErr } = await supabase.auth.signInWithPassword({
        email: 'admin@zerosynapses.com',
        password: 'ZP@147896325@ZP'
    });
    
    if (retryErr) {
        console.error("Retry login failed:", retryErr.message);
    } else {
        console.log("Retry login success! Session:", !!retryData.session);
    }
}

fixAdminAuth().catch(console.error);
