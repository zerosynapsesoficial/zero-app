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

async function testQuery() {
    console.log("Running OR query...");
    const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, user_type')
        .or('full_name.ilike.*zerozynapse*,user_type.eq.admin')
        .limit(5);

    console.log("Error:", error);
    console.log("Data:", data);
}

testQuery();
