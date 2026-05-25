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

async function checkFK() {
    const { data, error } = await supabase.from('profiles').insert([
        {
            id: '99999999-9999-9999-9999-999999999999',
            full_name: 'Test FK',
            user_type: 'professional',
            city: 'São Paulo, SP',
            address: 'Test Address'
        }
    ]).select();

    if (error) {
        console.log("FK test error:", error.message);
    } else {
        console.log("FK test success! Row inserted successfully without auth user:", data);
        // Clean it up immediately
        await supabase.from('profiles').delete().eq('id', '99999999-9999-9999-9999-999999999999');
    }
}

checkFK().catch(console.error);
