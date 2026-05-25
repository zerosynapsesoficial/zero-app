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

async function checkProfiles() {
    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, user_type');

    if (error) {
        console.error("Error fetching profiles:", error);
    } else {
        console.log("=== PROFILES IN DB ===");
        profiles.forEach(p => {
            console.log(`ID: ${p.id} | Name: ${p.full_name} | Email: ${p.email} | Type: ${p.user_type}`);
        });
    }
}

checkProfiles().catch(console.error);
