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

async function checkSchema() {
    const { data: professionals } = await supabase.from('profiles').select('*').eq('user_type', 'professional').limit(1);
    if (professionals && professionals.length > 0) {
        console.log("Professional Profile Row Keys & Values:");
        console.log(JSON.stringify(professionals[0], null, 2));
    } else {
        console.log("No professionals found in database.");
    }
}

checkSchema().catch(console.error);
