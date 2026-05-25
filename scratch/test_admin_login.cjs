const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function testLogin() {
    console.log("=== Testing Admin Login ===");
    
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'admin@zerosynapses.com',
        password: 'ZP@147896325@ZP'
    });

    if (error) {
        console.error("❌ Admin Login FAILED:", error.message);
        console.error("   Status:", error.status);
        
        // Check if user exists but is not confirmed
        if (error.message.includes('Email not confirmed')) {
            console.log("   -> Email exists but not confirmed. Need to confirm in Supabase dashboard.");
        }
        if (error.message.includes('Invalid login credentials')) {
            console.log("   -> Either email doesn't exist or password is wrong.");
        }
    } else {
        console.log("✅ Admin Login SUCCESS!");
        console.log("   User ID:", data.user.id);
        console.log("   Email:", data.user.email);
        console.log("   Session:", !!data.session);
        
        // Test message insert with real session
        console.log("\n=== Testing Message INSERT with session ===");
        const { data: msgData, error: msgErr } = await supabase.from('messages').insert([{
            sender_id: data.user.id,
            receiver_id: data.user.id, // self-message for testing
            content: 'Test message from script'
        }]).select().single();

        if (msgErr) {
            console.error("❌ Message INSERT failed:", msgErr.message);
        } else {
            console.log("✅ Message INSERT success:", msgData.id);
            // Clean up test message
            await supabase.from('messages').delete().eq('id', msgData.id);
            console.log("   Test message cleaned up.");
        }
    }
}

testLogin().catch(console.error);
