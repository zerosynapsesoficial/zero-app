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

async function test() {
    console.log("=== Querying a sample professional profile ===");
    const { data, error } = await supabase.from('profiles').select('*').eq('user_type', 'professional').limit(1);
    if (error) {
        console.error("Error:", error);
    } else {
        console.log("Sample professional profile:", JSON.stringify(data, null, 2));
    }
}

test().catch(console.error);
