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

async function checkFinal() {
    const { data: p, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0')
        .single();

    if (error) {
        console.error("❌ Erro ao verificar:", error.message);
        return;
    }

    console.log("=== PERFIL VERIFICADO ===");
    console.log("ID:", p.id);
    console.log("Nome:", p.full_name);
    console.log("Email:", p.email);
    console.log("User Type:", p.user_type);
    console.log("Avatar URL:", p.avatar_url);
}

checkFinal().catch(console.error);
