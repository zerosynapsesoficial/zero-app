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

async function searchSpecific() {
    console.log("🔍 Buscando perfis...");
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("❌ Erro:", error.message);
        return;
    }

    profiles.forEach(p => {
        const email = p.email || '';
        const name = p.full_name || '';
        if (email.toLowerCase().includes('lara') || name.toLowerCase().includes('lara')) {
            console.log("Found Match: ", p);
        }
    });
}

searchSpecific().catch(console.error);
