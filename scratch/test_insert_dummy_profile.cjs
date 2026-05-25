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

async function testInsertDummyProfile() {
    const dummyId = '00000000-0000-0000-0000-000000000000';
    console.log("Testing insert of dummy profile with ID:", dummyId);
    
    const { data, error } = await supabase.from('profiles').insert([{
        id: dummyId,
        full_name: 'Test Dummy Profile',
        user_type: 'client',
        created_at: new Date().toISOString()
    }]).select();

    if (error) {
        console.error("❌ Insertion failed!");
        console.error("Error Message:", error.message);
        console.error("Error Code:", error.code);
        console.error("Details:", error.details);
    } else {
        console.log("✅ Insertion succeeded!");
        console.log("Data:", data);
        
        // Clean up
        await supabase.from('profiles').delete().eq('id', dummyId);
    }
}

testInsertDummyProfile().catch(console.error);
