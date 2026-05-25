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

async function testInsert() {
    console.log("=== Testing Profile Insertion under RLS ===");
    // Generate a random UUID
    const testId = '44444444-4444-4444-4444-444444444444';
    
    // Clean up first
    await supabase.from('profiles').delete().eq('id', testId);

    const freshProfile = {
        id: testId,
        full_name: 'Test Client RLS Fix',
        user_type: 'client',
        created_at: new Date().toISOString()
    };

    console.log("Inserting profile:", freshProfile);
    const { data, error } = await supabase.from('profiles').insert([freshProfile]).select();
    
    if (error) {
        console.error("❌ Insertion failed under RLS:", error);
    } else {
        console.log("✅ Insertion succeeded! Profile details:", data);
        
        // Clean up
        const { error: delError } = await supabase.from('profiles').delete().eq('id', testId);
        if (delError) {
            console.error("❌ Clean up deletion failed:", delError);
        } else {
            console.log("✅ Clean up deletion succeeded!");
        }
    }
}

testInsert().catch(console.error);
