const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '.env';
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    lines.forEach(line => {
        if (line.trim().startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
        if (line.trim().startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
    });
} catch (e) {
    console.error('Error reading .env file');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAppointmentsRLS() {
    console.log("=== Checking appointments RLS policies ===\n");

    // Try to insert a test appointment using real IDs from profiles
    // First, get a real professional ID
    const { data: profs, error: profErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_type', 'professional')
        .limit(1);

    if (profErr || !profs || profs.length === 0) {
        console.error("❌ Cannot fetch professionals:", profErr);
        return;
    }
    
    const profId = profs[0].id;
    const profName = profs[0].full_name;
    console.log("Professional to use:", profName, profId);

    // Get a real client ID
    const { data: clients, error: clientErr } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('user_type', 'client')
        .limit(1);

    if (clientErr || !clients || clients.length === 0) {
        console.error("❌ Cannot fetch clients:", clientErr);
        return;
    }

    const clientId = clients[0].id;
    const clientName = clients[0].full_name;
    console.log("Client to use:", clientName, clientId);

    // Try inserting appointment using anon key (no user session)
    console.log("\n=== Attempting appointment insert with anon key (no session) ===");
    const { data: insertData, error: insertError } = await supabase
        .from('appointments')
        .insert([{
            professional_id: profId,
            client_id: clientId,
            date: '2026-06-01',
            time: '10:00',
            status: 'pending',
        }])
        .select();

    if (insertError) {
        console.error("❌ Insert failed:", insertError.code, insertError.message);
    } else {
        console.log("✅ Insert succeeded:", insertData);
        // Clean up
        if (insertData && insertData[0]) {
            await supabase.from('appointments').delete().eq('id', insertData[0].id);
            console.log("✅ Cleanup done");
        }
    }
}

checkAppointmentsRLS().catch(console.error);
