const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function testRealtimePublication() {
    console.log("=== Testing Realtime Publication Setup ===");
    
    // Check ifsupabase_realtime publication is set up
    const { data: pubData, error: pubErr } = await supabase.rpc('get_publications');
    if (pubErr) {
        console.warn("Could not check publications directly via RPC, trying to test realtime channel:", pubErr.message);
    } else {
        console.log("Publications:", pubData);
    }

    const channel = supabase.channel('realtime-diagnostic')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'messages' }, payload => {
            console.log("⚡ Change received:", payload);
        })
        .subscribe((status) => {
            console.log("📡 Channel subscription status:", status);
            if (status === 'SUBSCRIBED') {
                console.log("✅ Realtime is successfully connected and listening!");
                process.exit(0);
            } else if (status === 'CHANNEL_ERROR' || status === 'CLOSED') {
                console.error("❌ Subscription error or closed status!");
                process.exit(1);
            }
        });

    setTimeout(() => {
        console.error("❌ Timeout waiting for channel subscription!");
        process.exit(1);
    }, 5000);
}

testRealtimePublication().catch(console.error);
