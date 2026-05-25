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

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkMessages() {
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*').in('user_type', ['admin']);
    console.log("Admin Profiles:", JSON.stringify(profiles, null, 2));

    const { data: msgs, error } = await supabase.from('messages').select('*').order('created_at', { ascending: false }).limit(10);
    console.log("Last 10 Messages:", JSON.stringify(msgs, null, 2));

    const { data: notifs, error: nError } = await supabase.from('notifications').select('*').order('created_at', { ascending: false }).limit(10);
    console.log("Last 10 Notifications:", JSON.stringify(notifs, null, 2));
}

checkMessages();
