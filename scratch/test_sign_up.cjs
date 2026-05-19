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

async function testSignUp() {
    const testEmail = `aline.teste.${Math.floor(Math.random() * 10000)}@teste.com`;
    const testPassword = 'senha_teste_123';

    console.log("Signing up user:", testEmail);
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: {
            data: {
                full_name: 'Aline Teste',
                user_type: 'professional'
            }
        }
    });

    if (authError) {
        console.error("Sign up error:", authError.message);
        return;
    }

    const userId = authData.user.id;
    console.log("Sign up successful! User ID:", userId);

    // Let's check if the trigger created a profile row
    const { data: profileRow } = await supabase.from('profiles').select('*').eq('id', userId);
    console.log("Profile row exists:", profileRow);

    // Now update public.profiles with details
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .upsert({
            id: userId,
            full_name: 'Aline Teste',
            user_type: 'professional',
            category: 'Salão',
            specialty: 'Corte Especial',
            city: 'São Paulo, SP',
            address: 'Rua Augusta, 1000 - Consolação, São Paulo, SP',
            preferences: JSON.stringify({ rating: 4.8 })
        })
        .select();

    if (profileError) {
        console.error("Profile update error:", profileError.message);
    } else {
        console.log("Profile update successful! Data:", profileData);
        // Clean up
        await supabase.from('profiles').delete().eq('id', userId);
    }
}

testSignUp().catch(console.error);
