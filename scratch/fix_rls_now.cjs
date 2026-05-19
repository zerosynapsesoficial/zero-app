// Script para diagnosticar e confirmar o estado do RLS no Supabase
const { createClient } = require('@supabase/supabase-js');

const url = "https://oryguljbqcphbtiapvwk.supabase.co";
const serviceKey = process.env.SUPABASE_SERVICE_KEY || "";

if (!serviceKey) {
    console.error("❌ SUPABASE_SERVICE_KEY não definida. Use:");
    console.error("   $env:SUPABASE_SERVICE_KEY='sua_service_key_aqui'");
    console.error("   node scratch/fix_rls_now.cjs");
    process.exit(1);
}

const supabase = createClient(url, serviceKey, {
    auth: { persistSession: false }
});

async function main() {
    console.log("🔍 Testando conexão com service key...\n");

    // 1. Verificar tabela messages
    const { data: msgs, error: msgErr } = await supabase.from('messages').select('*').limit(5);
    if (msgErr) {
        console.error("❌ messages:", msgErr.message);
    } else {
        console.log(`✅ messages: ${msgs.length} registros encontrados`);
    }

    // 2. Verificar políticas RLS
    const { data: policies, error: polErr } = await supabase
        .rpc('pg_catalog.pg_policies', {})
        .select('*');
    
    // 3. Ver profiles
    const { data: profiles, error: profErr } = await supabase.from('profiles').select('id, full_name, user_type').limit(10);
    if (profErr) {
        console.error("❌ profiles:", profErr.message);
    } else {
        console.log("\n📋 Profiles:");
        profiles.forEach(p => console.log(`  ${p.user_type} | ${p.full_name} | ${p.id}`));
    }
}

main().catch(console.error);
