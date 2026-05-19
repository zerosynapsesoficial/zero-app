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

async function findLara() {
    console.log("🔍 Buscando todos os perfis...");
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("❌ Erro:", error.message);
        return;
    }

    console.log("\n=== LISTA DE PERFIS ===");
    profiles.forEach(p => {
        console.log(`ID: ${p.id} | Nome: ${p.full_name} | Tipo: ${p.user_type} | Avatar: ${p.avatar_url} | Outros campos: ${JSON.stringify(p)}`);
    });
}

findLara().catch(console.error);
