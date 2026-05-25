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

async function syncEmail() {
    console.log("🔄 Sincronizando e-mail da conta ZeroZynapses...");
    const { error } = await supabase
        .from('profiles')
        .update({ email: 'lara.cabeleireira@teste.com' })
        .eq('id', 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0');

    if (error) {
        console.error("❌ Erro ao atualizar e-mail:", error.message);
    } else {
        console.log("✅ E-mail de ZeroZynapses atualizado para 'lara.cabeleireira@teste.com' com sucesso!");
    }
}

syncEmail().catch(console.error);
