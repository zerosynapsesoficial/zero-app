const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    'https://oryguljbqcphbtiapvwk.supabase.co',
    'sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5'
);

// High-quality Unsplash photos for professional avatars (free, permanent URLs)
const professionalAvatars = [
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200',
];

const clientAvatars = [
    'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1542909168-82c3e7fdca5c?auto=format&fit=crop&q=80&w=200',
    'https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?auto=format&fit=crop&q=80&w=200',
];

async function updateAvatars() {
    console.log('🔄 Buscando perfis sem foto...\n');

    const { data: profiles, error } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, avatar_url')
        .or('avatar_url.is.null,avatar_url.eq.');

    if (error) {
        console.error('❌ Erro ao buscar perfis:', error.message);
        return;
    }

    if (!profiles || profiles.length === 0) {
        console.log('✅ Todos os perfis já têm foto!');
        // Let's also check ones with empty strings
        const { data: emptyProfiles } = await supabase
            .from('profiles')
            .select('id, full_name, user_type, avatar_url')
            .eq('avatar_url', '');
        
        if (emptyProfiles && emptyProfiles.length > 0) {
            console.log(`\n🔍 Encontrados ${emptyProfiles.length} perfis com avatar_url vazio:`);
            for (const p of emptyProfiles) {
                console.log(`  - ${p.full_name} (${p.user_type})`);
            }
            // Process these too
            await processProfiles(emptyProfiles);
        }
        return;
    }

    console.log(`📋 Encontrados ${profiles.length} perfis sem foto:\n`);
    await processProfiles(profiles);
}

async function processProfiles(profiles) {
    let profIndex = 0;
    let clientIndex = 0;

    for (const profile of profiles) {
        const isProf = profile.user_type === 'professional';
        const avatarPool = isProf ? professionalAvatars : clientAvatars;
        const index = isProf ? profIndex++ : clientIndex++;
        const avatarUrl = avatarPool[index % avatarPool.length];

        const { error: updateError } = await supabase
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('id', profile.id);

        if (updateError) {
            console.log(`  ❌ ${profile.full_name}: ${updateError.message}`);
        } else {
            console.log(`  ✅ ${profile.full_name} (${isProf ? 'Profissional' : 'Cliente'}) → foto atribuída`);
        }
    }

    console.log('\n🎉 Avatares atualizados com sucesso!');
}

// Also list ALL profiles to see current state
async function listAll() {
    const { data } = await supabase
        .from('profiles')
        .select('id, full_name, user_type, avatar_url')
        .order('created_at', { ascending: false });

    console.log('\n📊 TODOS OS PERFIS:');
    console.log('─'.repeat(80));
    for (const p of (data || [])) {
        const hasPhoto = p.avatar_url && p.avatar_url.length > 10;
        console.log(`  ${hasPhoto ? '📸' : '⚠️'} ${(p.full_name || 'Sem nome').padEnd(25)} ${(p.user_type || '?').padEnd(15)} ${hasPhoto ? '✓ Tem foto' : '✗ SEM FOTO'}`);
    }
    console.log('─'.repeat(80));
}

async function main() {
    await listAll();
    await updateAvatars();
    await listAll();
}

main();
