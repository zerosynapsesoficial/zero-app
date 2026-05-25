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

async function printProfData() {
    const { data, error } = await supabase.from('profiles').select('*').eq('user_type', 'professional');
    if (error) {
        console.error("Error querying profiles:", error);
        return;
    }
    console.log("=== PROFESSIONAL PROFILES IN DB ===");
    data.forEach(p => {
        console.log(`Name: ${p.full_name}`);
        console.log(`  Specialty: ${p.specialty}`);
        console.log(`  Price Range: ${p.price_range}`);
        console.log(`  Phone: ${p.phone}`);
        console.log(`  Address: ${p.address}`);
        console.log(`  City: ${p.city}`);
        console.log("---");
    });
}

printProfData().catch(console.error);
