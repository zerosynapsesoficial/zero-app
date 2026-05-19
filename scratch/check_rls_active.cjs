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

async function unlockRLS() {
    console.log("Checking policies...");
    
    // As we can't run raw SQL from the anon key without a function, we will create a message and see if it fails.
    const { data: msgData, error: msgErr } = await supabase.from('messages').insert([{
        sender_id: '00000000-0000-0000-0000-000000000000', // Mock UUID
        receiver_id: 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0', // Admin UUID
        content: 'Test message to check RLS'
    }]);

    if (msgErr) {
        console.error("Insert failed! RLS is still active:", msgErr.message);
    } else {
        console.log("Insert succeeded. RLS is already unlocked!");
    }
}

unlockRLS();
