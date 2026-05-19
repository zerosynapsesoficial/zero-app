const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function verifyAdminUser() {
    console.log("=== Checking admin profiles in Supabase ===\n");

    const { data: profiles, error: profErr } = await supabase
        .from('profiles')
        .select('*')
        .eq('user_type', 'admin');
    
    if (profErr) {
        console.log("❌ Profiles query failed:", profErr.message);
    } else {
        console.log("✅ Admin profiles found:", profiles?.length);
        profiles?.forEach(p => {
            console.log(`  - ID: ${p.id}`);
            console.log(`  - Name: ${p.full_name}`);
            console.log(`  - Type: ${p.user_type}`);
        });
    }

    console.log("\n=== Testing possible passwords for admin accounts ===");
    
    const testCases = [
        { email: 'lara.cabeleireira@teste.com', pass: 'ZP@147896325@ZP' },
        { email: 'lara.cabeleireira@teste.com', pass: 'senha123' },
        { email: 'lara.cabeleireira@teste.com', pass: 'ZP147896325ZP' },
        { email: 'lara.cabeleireira@teste.com', pass: 'ZeroZynapses' },
        { email: 'admin@zerosynapses.com', pass: 'ZP@147896325@ZP' },
        { email: 'admin@zero.com', pass: 'ZP@147896325@ZP' },
    ];

    for (const tc of testCases) {
        const { data, error } = await supabase.auth.signInWithPassword({
            email: tc.email,
            password: tc.pass
        });
        if (error) {
            console.log(`  ❌ ${tc.email} | ${tc.pass} → ${error.message}`);
        } else {
            console.log(`  ✅ SUCCESS: ${tc.email} | ${tc.pass} → User ID: ${data.user.id}`);
            await supabase.auth.signOut();
        }
    }
}

verifyAdminUser().catch(console.error);
