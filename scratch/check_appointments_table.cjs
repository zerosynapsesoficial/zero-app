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

async function check() {
    console.log("=== Checking appointments table ===");
    
    // 1. Try to query appointments
    const { data: selectData, error: selectError } = await supabase
        .from('appointments')
        .select('*')
        .limit(1);
        
    if (selectError) {
        console.error("SELECT Error:", selectError);
    } else {
        console.log("SELECT success! Sample row:", selectData);
    }

    // 2. Insert dummy appointment to test
    console.log("=== Testing insert into appointments ===");
    const dummyApp = {
        professional_id: 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d', // Marcos Silva or similar uuid
        client_id: 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0', // Admin uuid
        date: '2026-06-01',
        time: '10:00',
        status: 'pending',
        service_name: 'TEST CUT',
        price: 45.00
    };

    const { data: insertData, error: insertError } = await supabase
        .from('appointments')
        .insert([dummyApp])
        .select();

    if (insertError) {
        console.error("INSERT Error details:", JSON.stringify(insertError, null, 2));
    } else {
        console.log("INSERT success! Inserted row:", insertData);
        // Clean up
        if (insertData && insertData[0]) {
            const { error: deleteError } = await supabase
                .from('appointments')
                .delete()
                .eq('id', insertData[0].id);
            console.log("Cleanup delete:", deleteError ? deleteError : "Success");
        }
    }
}

check().catch(console.error);
