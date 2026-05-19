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

async function checkAllKeys() {
    const { data: profiles } = await supabase.from('profiles').select('*').limit(10);
    if (profiles && profiles.length > 0) {
        console.log("Keys in profiles rows:");
        profiles.forEach(p => {
            console.log(`Name: ${p.full_name} | Type: ${p.user_type}`);
            console.log("Keys:", Object.keys(p));
            console.log("Rating value:", p.rating);
            console.log("---");
        });
    }
}

checkAllKeys().catch(console.error);
