const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const envPath = '.env';
let SUPABASE_URL = '';
let SUPABASE_KEY = '';

try {
    const envFile = fs.readFileSync(envPath, 'utf8');
    const lines = envFile.split('\n');
    lines.forEach(line => {
        if (line.trim().startsWith('VITE_SUPABASE_URL=')) SUPABASE_URL = line.split('=')[1].trim();
        if (line.trim().startsWith('VITE_SUPABASE_ANON_KEY=')) SUPABASE_KEY = line.split('=')[1].trim();
    });
} catch (e) {
    console.error('Error reading .env file');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function updateProfessionals() {
    console.log("=== Updating Professional Contacts and Addresses in Supabase ===");

    // 1. Marcos Silva
    const { error: err1 } = await supabase
        .from('profiles')
        .update({
            phone: '(11) 98765-4321',
            address: 'Av. Paulista, 1000 - Bela Vista',
            city: 'São Paulo, SP'
        })
        .eq('full_name', 'Marcos Silva');
    if (err1) console.error("Error updating Marcos:", err1.message);
    else console.log("✅ Marcos Silva updated successfully.");

    // 2. Juliana Beauty
    const { error: err2 } = await supabase
        .from('profiles')
        .update({
            phone: '(11) 99123-4567',
            address: 'Rua Augusta, 1500 - Consolação',
            city: 'São Paulo, SP'
        })
        .eq('full_name', 'Juliana Beauty');
    if (err2) console.error("Error updating Juliana:", err2.message);
    else console.log("✅ Juliana Beauty updated successfully.");

    // 3. Rodrigo Barber
    const { error: err3 } = await supabase
        .from('profiles')
        .update({
            phone: '(11) 97543-2109',
            address: 'Av. Brigadeiro Luís Antônio, 2300 - Jardim Paulista',
            city: 'São Paulo, SP'
        })
        .eq('full_name', 'Rodrigo Barber');
    if (err3) console.error("Error updating Rodrigo:", err3.message);
    else console.log("✅ Rodrigo Barber updated successfully.");

    console.log("\n=== Done updating professionals ===");
}

updateProfessionals().catch(console.error);
