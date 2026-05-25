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

async function testInsert() {
    const insertData = {
        professional_id: 'b2c3d4e5-f6a7-4b6c-9d8e-1f0a2b3c4d5e', // Juliana Beauty
        client_id: '95c2a89c-ab1b-4417-89ba-edad29cabfe4',       // Test Client
        date: '2026-05-20',
        time: '09:00',
        status: 'pending',
        service_name: 'Corte de Cabelo',
        price: 50.00
    };

    console.log("Attempting to insert appointment:", insertData);
    const { data, error } = await supabase.from('appointments').insert([insertData]).select();

    if (error) {
        console.error("❌ Insertion failed!");
        console.error("Error Message:", error.message);
        console.error("Error Code:", error.code);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
    } else {
        console.log("✅ Insertion succeeded!");
        console.log("Data:", data);
        
        // Clean up the test appointment
        const { error: delErr } = await supabase.from('appointments').delete().eq('id', data[0].id);
        if (delErr) {
            console.error("Could not delete test appointment:", delErr.message);
        } else {
            console.log("Cleaned up test appointment successfully!");
        }
    }
}

testInsert().catch(console.error);
