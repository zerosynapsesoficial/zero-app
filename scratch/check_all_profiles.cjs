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

async function checkAll() {
    // Get ALL profiles with full detail
    const { data: profiles } = await supabase.from('profiles').select('*').order('created_at', { ascending: true });
    
    console.log("=== ALL PROFILES ===");
    profiles?.forEach(p => {
        console.log(`ID: ${p.id}`);
        console.log(`  Name: ${p.full_name}`);
        console.log(`  Type: ${p.user_type}`);
        console.log(`  Email: ${p.email || 'N/A'}`);
        console.log(`  Points: ${p.points}`);
        console.log(`  Created: ${p.created_at}`);
        console.log('---');
    });

    // Check what the Supabase client URL looks like for localStorage key
    const urlObj = new URL(SUPABASE_URL);
    const projectID = urlObj.hostname.split('.')[0];
    const storageKey = `sb-${projectID}-auth-token`;
    console.log(`\n=== localStorage key format ===`);
    console.log(`Expected key: ${storageKey}`);
}

checkAll().catch(console.error);
