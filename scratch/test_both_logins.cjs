const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function testLogins() {
    // Test 1: lara.cabeleireira@teste.com with the ZP password
    console.log("=== Test 1: lara.cabeleireira@teste.com with ZP password ===");
    const { data: d1, error: e1 } = await supabase.auth.signInWithPassword({
        email: 'lara.cabeleireira@teste.com',
        password: 'ZP@147896325@ZP'
    });
    if (e1) {
        console.log("❌ FAILED:", e1.message);
    } else {
        console.log("✅ SUCCESS! User:", d1.user?.id, "Session:", !!d1.session);
        
        // Test insert with this session
        const { data: msgData, error: msgErr } = await supabase.from('messages').insert([{
            sender_id: d1.user.id,
            receiver_id: '98ad1dc6-4d36-4850-8979-55a75bcb9776',
            content: 'Test admin message'
        }]).select().single();
        
        if (msgErr) {
            console.log("  ❌ Message INSERT failed:", msgErr.message);
        } else {
            console.log("  ✅ Message INSERT SUCCESS:", msgData.id);
            // Clean up
            await supabase.from('messages').delete().eq('id', msgData.id);
        }
        
        await supabase.auth.signOut();
    }

    // Test 2: anhderson1@gmail.com with ZP password
    console.log("\n=== Test 2: anhderson1@gmail.com with ZP password ===");
    const { data: d2, error: e2 } = await supabase.auth.signInWithPassword({
        email: 'anhderson1@gmail.com',
        password: 'ZP@147896325@ZP'
    });
    if (e2) {
        console.log("❌ FAILED:", e2.message);
    } else {
        console.log("✅ SUCCESS! User:", d2.user?.id, "Session:", !!d2.session);
        await supabase.auth.signOut();
    }
}

testLogins().catch(console.error);
