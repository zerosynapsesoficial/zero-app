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

async function setLogoPhoto() {
    console.log("🔍 Buscando perfis...");

    // 1. Get all profiles to scan full_name and email
    const { data: profiles, error } = await supabase.from('profiles').select('*');
    if (error) {
        console.error("❌ Erro ao buscar perfis:", error.message);
        return;
    }

    console.log(`📋 Escaneando ${profiles.length} perfis no banco...`);

    const targets = [];
    profiles.forEach(p => {
        const nameMatch = p.full_name && p.full_name.toLowerCase().includes('zerozynapses');
        const emailMatch = p.email && p.email.toLowerCase().includes('zerozynapses');
        const laraMatch = p.email && p.email.toLowerCase() === 'lara.cabeleireira@teste.com';
        const laraNameMatch = p.full_name && p.full_name.toLowerCase().includes('lara');

        if (nameMatch || emailMatch || laraMatch || laraNameMatch) {
            targets.push(p);
        }
    });

    if (targets.length === 0) {
        console.log("⚠️ Nenhum perfil correspondente encontrado para ZeroZynapses ou lara.cabeleireira@teste.com");
        return;
    }

    console.log(`✨ Encontrados ${targets.length} perfis correspondentes:`);
    for (const t of targets) {
        console.log(`  - Nome: ${t.full_name} | Email: ${t.email || 'N/A'} | Tipo: ${t.user_type} | ID: ${t.id}`);
        
        // Update avatar_url to assets/logo.png
        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: 'assets/logo.png' })
            .eq('id', t.id);

        if (updateError) {
            console.error(`  ❌ Falha ao atualizar avatar de ${t.full_name}:`, updateError.message);
        } else {
            console.log(`  ✅ ${t.full_name} atualizado com a foto 'assets/logo.png' com sucesso!`);
        }
    }
}

setLogoPhoto().catch(console.error);
