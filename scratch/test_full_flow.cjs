const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function testFullChatFlow() {
    console.log("=== Testing Full Chat Flow for Mock Clients & Admins ===");
    
    // Felipe Souza (mock client) ID
    const clientUuid = 'e5f6a7b8-c9d0-4e1f-2a3b-4c5d6e7f8a9b';
    // Marcos Silva (mock professional) ID
    const profUuid = 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
    // ZeroZynapses (admin) ID
    const adminUuid = 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0';

    // 1. Client sends message to Admin Support
    console.log("\n1️⃣ Client sending message to Admin Support...");
    const { data: msg1, error: err1 } = await supabase.from('messages').insert([{
        sender_id: clientUuid,
        receiver_id: adminUuid,
        content: 'Olá Suporte! Eu sou o Felipe Souza e estou testando o chat em tempo real!'
    }]).select().single();

    if (err1) {
        console.error("❌ Failed client -> admin insert:", err1.message);
    } else {
        console.log("✅ Client -> Admin Message Inserted! ID:", msg1.id);
    }

    // 2. Admin sends message to Mock Professional
    console.log("\n2️⃣ Admin sending message to Mock Professional...");
    const { data: msg2, error: err2 } = await supabase.from('messages').insert([{
        sender_id: adminUuid,
        receiver_id: profUuid,
        content: 'Olá Marcos Silva! Este é o suporte técnico confirmando seu Plano Plus!'
    }]).select().single();

    if (err2) {
        console.error("❌ Failed admin -> professional insert:", err2.message);
    } else {
        console.log("✅ Admin -> Professional Message Inserted! ID:", msg2.id);
    }

    // 3. Query all messages for Felipe Souza
    console.log("\n3️⃣ Fetching messages for Client Felipe Souza...");
    const { data: messages, error: err3 } = await supabase.from('messages')
        .select('*')
        .or(`sender_id.eq.${clientUuid},receiver_id.eq.${clientUuid}`)
        .order('created_at', { ascending: true });

    if (err3) {
        console.error("❌ Failed to fetch messages:", err3.message);
    } else {
        console.log(`✅ Fetched ${messages.length} messages for Felipe Souza:`);
        messages.forEach(m => {
            console.log(`   [${m.sender_id === clientUuid ? 'CLIENT' : 'ADMIN'}] ${m.content} (${m.created_at})`);
        });
    }

    // 4. Query all notifications for Felipe Souza
    console.log("\n4️⃣ Fetching notifications for Client Felipe Souza...");
    const { data: notifications, error: err4 } = await supabase.from('notifications')
        .select('*')
        .eq('user_id', clientUuid);

    if (err4) {
        console.error("❌ Failed to fetch notifications:", err4.message);
    } else {
        console.log(`✅ Fetched ${notifications.length} notifications:`);
        notifications.forEach(n => {
            console.log(`   📬 [${n.title}] ${n.content}`);
        });
    }

    // Cleanup test messages
    console.log("\n5️⃣ Cleaning up test messages...");
    if (msg1) await supabase.from('messages').delete().eq('id', msg1.id);
    if (msg2) await supabase.from('messages').delete().eq('id', msg2.id);
    console.log("✅ Cleanup complete.");
}

testFullChatFlow().catch(console.error);
