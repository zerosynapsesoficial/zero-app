const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '.env';
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    lines.forEach(line => {
        if (line.startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
        if (line.startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
    });
} catch (e) {
    console.error('Error reading .env file');
}

console.log("URL:", SUPABASE_URL);
console.log("Key:", SUPABASE_KEY.substring(0, 20) + '...');

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function test() {
    console.log("\n=== TEST 1: Connection / Profiles ===");
    const { data: profiles, error: pErr } = await supabase.from('profiles').select('id, full_name, user_type').limit(5);
    if (pErr) {
        console.error("❌ Profiles query failed:", pErr.message);
    } else {
        console.log("✅ Profiles:", profiles?.length, "found");
        profiles?.forEach(p => console.log(`   - ${p.full_name} (${p.user_type}) [${p.id}]`));
    }

    console.log("\n=== TEST 2: Messages Table ===");
    const { data: msgs, error: mErr } = await supabase.from('messages').select('id, sender_id, receiver_id, content', { count: 'exact' }).limit(3);
    if (mErr) {
        console.error("❌ Messages query failed:", mErr.message);
        console.error("   Code:", mErr.code, "Details:", mErr.details);
    } else {
        console.log("✅ Messages:", msgs?.length, "found");
        msgs?.forEach(m => console.log(`   - [${m.sender_id?.substring(0,8)}...] -> [${m.receiver_id?.substring(0,8)}...]: ${m.content?.substring(0,40)}`));
    }

    console.log("\n=== TEST 3: Auth Session ===");
    const { data: session, error: sErr } = await supabase.auth.getSession();
    if (sErr) {
        console.error("❌ Session error:", sErr.message);
    } else if (session?.session) {
        console.log("✅ Active session for:", session.session.user?.email);
    } else {
        console.log("⚠️ No active session (expected - this is a server-side script)");
    }

    console.log("\n=== TEST 4: RLS Policies Check (via messages table) ===");
    const { count, error: cErr } = await supabase.from('messages').select('*', { count: 'exact', head: true });
    if (cErr) {
        console.error("❌ Count failed:", cErr.message);
    } else {
        console.log("✅ Total messages in DB:", count);
    }

    console.log("\n=== TEST 5: Admin Profile ===");
    const { data: admin, error: aErr } = await supabase.from('profiles').select('*').eq('user_type', 'admin');
    if (aErr) {
        console.error("❌ Admin query failed:", aErr.message);
    } else {
        console.log("✅ Admin profiles:", admin?.length);
        admin?.forEach(a => console.log(`   - ${a.full_name} [${a.id}] user_type=${a.user_type}`));
    }

    console.log("\n=== DONE ===");
}

test().catch(console.error);
