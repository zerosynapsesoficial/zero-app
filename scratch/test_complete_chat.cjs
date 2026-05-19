const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const key = "sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5";

const supabase = createClient(url, key);

async function testFullChatFlow() {
    console.log("========================================");
    console.log(" ZERO APP - TESTE COMPLETO DO CHAT");
    console.log("========================================\n");

    // 1. Login as ZeroZynapses admin
    console.log("1️⃣  Login como ZeroZynapses (admin)...");
    const { data: adminLogin, error: loginErr } = await supabase.auth.signInWithPassword({
        email: 'lara.cabeleireira@teste.com',
        password: 'ZP@147896325@ZP'
    });

    if (loginErr) {
        console.error("❌ Login FALHOU:", loginErr.message);
        return;
    }
    console.log("   ✅ Login OK! User ID:", adminLogin.user.id);
    console.log("   ✅ Session:", !!adminLogin.session);

    // 2. Check profile
    console.log("\n2️⃣  Verificando perfil no banco...");
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', adminLogin.user.id).single();
    console.log("   ✅ Perfil:", profile?.full_name, "| user_type:", profile?.user_type);

    // 3. Send a message (admin -> Anderson)
    const receiverId = '98ad1dc6-4d36-4850-8979-55a75bcb9776';
    console.log("\n3️⃣  Enviando mensagem admin->Anderson...");
    const { data: msg, error: msgErr } = await supabase.from('messages').insert([{
        sender_id: adminLogin.user.id,
        receiver_id: receiverId,
        content: 'Olá Anderson! Esta é uma mensagem de teste do Suporte Zero. 🚀'
    }]).select().single();

    if (msgErr) {
        console.error("   ❌ INSERT FALHOU:", msgErr.message);
    } else {
        console.log("   ✅ Mensagem enviada com sucesso! ID:", msg.id);
    }

    // 4. Fetch messages for this conversation
    console.log("\n4️⃣  Buscando mensagens da conversa...");
    const { data: messages, error: fetchErr } = await supabase
        .from('messages')
        .select('*')
        .or(`and(sender_id.eq.${adminLogin.user.id},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${adminLogin.user.id})`)
        .order('created_at', { ascending: true });

    if (fetchErr) {
        console.error("   ❌ FETCH FALHOU:", fetchErr.message);
    } else {
        console.log("   ✅ Mensagens encontradas:", messages.length);
        messages.forEach(m => {
            const dir = m.sender_id === adminLogin.user.id ? '→' : '←';
            console.log(`      ${dir} ${m.content.substring(0, 50)}... (${new Date(m.created_at).toLocaleTimeString('pt-BR')})`);
        });
    }

    // 5. Check notifications
    console.log("\n5️⃣  Verificando notificações...");
    const { data: notifs, error: notifErr } = await supabase
        .from('notifications')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(3);

    if (notifErr) {
        console.error("   ❌ NOTIF FETCH FALHOU:", notifErr.message);
    } else {
        console.log("   ✅ Notificações:", notifs?.length);
        notifs?.forEach(n => console.log(`      📬 ${n.title}: ${n.content?.substring(0, 40)}...`));
    }

    // 6. Realtime check
    console.log("\n6️⃣  Testando Realtime subscription...");
    const channel = supabase
        .channel('test-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, payload => {
            console.log("   ⚡ Realtime event received:", payload.new.content?.substring(0, 30));
        })
        .subscribe((status) => {
            console.log("   📡 Realtime status:", status);
        });

    // Wait a moment for subscription
    await new Promise(r => setTimeout(r, 2000));

    // Send another message to trigger realtime
    const { error: rtErr } = await supabase.from('messages').insert([{
        sender_id: adminLogin.user.id,
        receiver_id: receiverId,
        content: 'Mensagem de teste Realtime ⚡'
    }]);

    if (rtErr) {
        console.error("   ❌ Realtime test INSERT failed:", rtErr.message);
    }

    await new Promise(r => setTimeout(r, 3000));
    supabase.removeChannel(channel);

    console.log("\n========================================");
    console.log(" ✅ TESTE COMPLETO FINALIZADO");
    console.log("========================================\n");
    
    // Cleanup
    await supabase.auth.signOut();
    process.exit(0);
}

testFullChatFlow().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
