const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function verifyNotificationGeneration() {
    console.log("=== Testing Automated Message Notifications ===");

    // Felipe Souza (mock client) ID
    const clientUuid = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';
    // Marcos Silva (mock professional) ID
    const profUuid = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';

    console.log("1️⃣ Sending test message Client -> Professional...");
    const { data: msg, error: insertErr } = await supabase.from('messages').insert([{
        sender_id: clientUuid,
        receiver_id: profUuid,
        content: 'Oi Marcos, preciso de um corte de cabelo hoje à tarde!'
    }]).select().single();

    if (insertErr) {
        console.error("❌ Message insert failed:", insertErr.message);
        return;
    }
    console.log("✅ Message inserted successfully! ID:", msg.id);

    console.log("2️⃣ Waiting 1 second for database trigger to generate notification...");
    await new Promise(r => setTimeout(r, 1000));

    console.log("3️⃣ Querying notifications generated for Professional Marcos Silva...");
    const { data: notifs, error: fetchErr } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', profUuid)
        .order('created_at', { ascending: false });

    if (fetchErr) {
        console.error("❌ Failed to query notifications:", fetchErr.message);
    } else if (notifs.length === 0) {
        console.warn("⚠️ No notifications generated! Trigger might not have executed.");
    } else {
        console.log(`✅ Success! Found ${notifs.length} notifications for Marcos Silva:`);
        notifs.forEach(n => {
            console.log(`   📬 [${n.title}] Content: "${n.content}" | Link: "${n.link}"`);
        });

        // Cleanup notifications
        await supabase.from('notifications').delete().eq('user_id', profUuid);
        console.log("✅ Cleaned up generated notifications.");
    }

    // Cleanup message
    await supabase.from('messages').delete().eq('id', msg.id);
    console.log("✅ Cleaned up test message.");
}

verifyNotificationGeneration().catch(console.error);
