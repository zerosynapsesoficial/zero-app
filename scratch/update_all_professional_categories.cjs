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

const categoryMapping = {
    'juliana beauty': 'Estúdio de Beleza',
    'rodrigo barber': 'Barbearia',
    'marcos silva': 'Salão',
    'carlos barbeiro': 'Barbearia',
    'daisy souza': 'Salão',
    'terapeuta capilar': 'Espaço'
};

async function updateCategories() {
    const { data: professionals, error: fetchError } = await supabase
        .from('profiles')
        .select('id, full_name, category')
        .eq('user_type', 'professional');

    if (fetchError) {
        console.error("Error fetching professionals:", fetchError);
        return;
    }

    console.log(`Found ${professionals.length} professionals. Updating categories...`);

    for (const p of professionals) {
        const nameLower = (p.full_name || '').toLowerCase();
        let targetCategory = 'Salão'; // default

        for (const [key, cat] of Object.entries(categoryMapping)) {
            if (nameLower.includes(key)) {
                targetCategory = cat;
                break;
            }
        }

        // If no direct keyword matches, check general keywords
        if (targetCategory === 'Salão') {
            if (nameLower.includes('barber') || nameLower.includes('barbearia') || nameLower.includes('barbeiro')) {
                targetCategory = 'Barbearia';
            } else if (nameLower.includes('beauty') || nameLower.includes('estúdio') || nameLower.includes('estudio')) {
                targetCategory = 'Estúdio de Beleza';
            } else if (nameLower.includes('espaço') || nameLower.includes('espaco') || nameLower.includes('clínica') || nameLower.includes('clinica')) {
                targetCategory = 'Espaço';
            }
        }

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ category: targetCategory })
            .eq('id', p.id);

        if (updateError) {
            console.error(`Failed to update ${p.full_name}:`, updateError);
        } else {
            console.log(`Updated ${p.full_name} to category: "${targetCategory}"`);
        }
    }

    console.log("Category update completed successfully!");
}

updateCategories().catch(console.error);
