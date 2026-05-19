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

const professionals = [
    {
        name: 'Aline Ribeiro',
        email: 'aline.ribeiro@teste.com',
        category: 'Estúdio de Beleza',
        specialty: 'Extensão de Cílios',
        address: 'Rua Guilherme Valente, 310 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 98765-4321',
        rating: 4.9,
        avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Bruno Trancista',
        email: 'bruno.trancista@teste.com',
        category: 'Espaço',
        specialty: 'Tranças Nagô',
        address: 'Avenida Maria Coelho Aguiar, 215 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 97654-3210',
        rating: 2.8,
        avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Carla Nails',
        email: 'carla.nails@teste.com',
        category: 'Estúdio de Beleza',
        specialty: 'Unhas de Gel',
        address: 'Estrada do M\'Boi Mirim, 150 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 96543-2109',
        rating: 3.2,
        avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Diego Barbearia',
        email: 'diego.barbearia@teste.com',
        category: 'Barbearia',
        specialty: 'Corte Degradê',
        address: 'Rua Geraldo Fraga de Oliveira, 80 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 95432-1098',
        rating: 4.7,
        avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Eliane Cabelos',
        email: 'eliane.cabelos@teste.com',
        category: 'Salão',
        specialty: 'Escova Progressiva',
        address: 'Rua Chácara do Sol, 45 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 94321-0987',
        rating: 3.4,
        avatar_url: 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Felipe Studio',
        email: 'felipe.studio@teste.com',
        category: 'Espaço',
        specialty: 'Tatuagem & Piercing',
        address: 'Rua Estanislau Moniusko, 12 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 93210-9876',
        rating: 5.0,
        avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Gisele Massagem',
        email: 'gisele.massagem@teste.com',
        category: 'Espaço',
        specialty: 'Massoterapia',
        address: 'Rua Inácio Dias de Lemos, 55 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 92109-8765',
        rating: 3.0,
        avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Hugo Cortes',
        email: 'hugo.cortes@teste.com',
        category: 'Barbearia',
        specialty: 'Barboterapia',
        address: 'Rua José Manoel de Sousa, 24 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 91098-7654',
        rating: 4.8,
        avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Isabela Estética',
        email: 'isabela.estetica@teste.com',
        category: 'Estúdio de Beleza',
        specialty: 'Limpeza de Pele',
        address: 'Rua Luís da Fonseca, 90 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 90987-6543',
        rating: 3.5,
        avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'João Barber',
        email: 'joao.barber@teste.com',
        category: 'Barbearia',
        specialty: 'Corte & Barba',
        address: 'Rua Manoel Vitor de Jesus, 200 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 99876-5432',
        rating: 4.9,
        avatar_url: 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=200'
    },
    {
        name: 'Kelly Visagismo',
        email: 'kelly.visagismo@teste.com',
        category: 'Salão',
        specialty: 'Visagismo & Cor',
        address: 'Rua Nelson de Oliveira, 110 - Jardim São Luís, São Paulo, SP',
        phone: '(11) 98765-0123',
        rating: 5.0,
        avatar_url: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200'
    }
];

async function insertAll() {
    console.log(`=== Starting Insertion of 11 Professionals near Jardim São Luís ===`);
    
    for (const p of professionals) {
        let userId = '';
        
        console.log(`Signing up ${p.name} (${p.email})...`);
        const { data: authData, error: authError } = await supabase.auth.signUp({
            email: p.email,
            password: 'senha_teste_123',
            options: {
                data: {
                    full_name: p.name,
                    user_type: 'professional'
                }
            }
        });

        if (authError) {
            if (authError.message.includes('already registered')) {
                console.log(`   User already registered, searching for existing ID...`);
                // Querying the profiles table to get the existing ID by email if possible,
                // or signing in to retrieve it, or using metadata.
                const { data: existingProfiles, error: findError } = await supabase
                    .from('profiles')
                    .select('id')
                    .eq('full_name', p.name);
                
                if (existingProfiles && existingProfiles.length > 0) {
                    userId = existingProfiles[0].id;
                } else {
                    console.log(`   Warning: Could not retrieve ID for ${p.name}. Trying to sign in to fetch ID...`);
                    const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
                        email: p.email,
                        password: 'senha_teste_123'
                    });
                    if (signInData && signInData.user) {
                        userId = signInData.user.id;
                    } else {
                        console.error(`   Failed to sign in: ${signInError ? signInError.message : 'Unknown error'}`);
                        continue;
                    }
                }
            } else {
                console.error(`   Sign up failed: ${authError.message}`);
                continue;
            }
        } else {
            userId = authData.user.id;
        }

        console.log(`   Upserting profile for ${p.name} (ID: ${userId})...`);
        const { error: profileError } = await supabase
            .from('profiles')
            .upsert({
                id: userId,
                full_name: p.name,
                user_type: 'professional',
                category: p.category,
                specialty: p.specialty,
                city: 'São Paulo, SP',
                address: p.address,
                phone: p.phone,
                avatar_url: p.avatar_url,
                preferences: JSON.stringify({ rating: p.rating }),
                points: 10,
                verified: p.rating >= 4.5
            });

        if (profileError) {
            console.error(`   ❌ Failed to insert profile for ${p.name}: ${profileError.message}`);
        } else {
            console.log(`   ✅ Successfully created profile for ${p.name} with rating ${p.rating}!`);
        }
    }
    
    console.log("=== Completed Insertion! ===");
}

insertAll().catch(console.error);
