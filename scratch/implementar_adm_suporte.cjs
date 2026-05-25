const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oryguljbqcphbtiapvwk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5';
const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const ADMIN_EMAILS = [
    'admin@zerosynapses.com',
    'zerosynapsesoficial@gmail.com',
    'lara.cabeleireira@teste.com'
];

async function run() {
    console.log('='.repeat(55));
    console.log('  IMPLEMENTANDO: Contas ADM = Suporte');
    console.log('='.repeat(55));

    // 1. Ver todos os perfis atuais
    console.log('\n[1] Perfis existentes no banco...');
    const { data: allProfiles, error: fetchErr } = await sb
        .from('profiles')
        .select('id, full_name, email, user_type')
        .order('created_at', { ascending: true });

    if (fetchErr) {
        console.error('Erro ao buscar perfis:', fetchErr.message);
        return;
    }

    console.log(`  Total de perfis: ${allProfiles.length}`);
    allProfiles.forEach(p => {
        const isAdminEmail = ADMIN_EMAILS.some(e => (p.email || '').toLowerCase().includes(e));
        const tag = isAdminEmail ? ' ← DEVE SER ADMIN' : '';
        console.log(`  [${p.user_type?.toUpperCase().padEnd(12)}] ${p.full_name || '(sem nome)'} | ${p.email || '(sem email)'}${tag}`);
    });

    // 2. Atualizar perfis com emails admin que ainda não são admin
    console.log('\n[2] Atualizando perfis para admin...');
    for (const adminEmail of ADMIN_EMAILS) {
        const profile = allProfiles.find(p => (p.email || '').toLowerCase().includes(adminEmail));

        if (!profile) {
            console.log(`  [--] ${adminEmail} -> NAO ENCONTRADO no banco (fara login pela 1a vez)`);
            continue;
        }

        if (profile.user_type === 'admin') {
            console.log(`  [OK] ${adminEmail} -> JA E ADMIN (${profile.full_name})`);
            continue;
        }

        const { error: updateErr } = await sb
            .from('profiles')
            .update({ user_type: 'admin' })
            .eq('id', profile.id);

        if (updateErr) {
            console.log(`  [X]  ${adminEmail} -> ERRO: ${updateErr.message}`);
        } else {
            console.log(`  [UP] ${adminEmail} -> ATUALIZADO PARA ADMIN! (${profile.full_name})`);
        }
    }

    // 3. Verificar mensagens de suporte
    console.log('\n[3] Mensagens de suporte no banco...');
    const { data: adminProfilesNow } = await sb
        .from('profiles')
        .select('id, full_name, email')
        .eq('user_type', 'admin');

    const adminIds = (adminProfilesNow || []).map(p => p.id);
    console.log(`  Contas admin encontradas: ${adminProfilesNow?.length || 0}`);
    (adminProfilesNow || []).forEach(p => console.log(`    - ${p.full_name} (${p.email}) [${p.id.slice(0,8)}...]`));

    if (adminIds.length > 0) {
        const { data: supportMsgs, error: msgErr } = await sb
            .from('messages')
            .select('id, content, sender_id, receiver_id, created_at, is_read')
            .in('receiver_id', adminIds)
            .order('created_at', { ascending: false })
            .limit(10);

        if (msgErr) {
            console.log('  Erro ao buscar mensagens:', msgErr.message);
        } else {
            console.log(`  Mensagens recebidas pelos admins: ${supportMsgs?.length || 0}`);
            (supportMsgs || []).slice(0, 5).forEach(m => {
                const time = new Date(m.created_at).toLocaleString('pt-BR');
                const read = m.is_read ? 'lida' : 'NAO LIDA';
                console.log(`    [${read}] "${m.content.slice(0, 50)}..." - ${time}`);
            });
        }
    }

    // 4. Resultado final
    console.log('\n[4] Estado final dos admins...');
    const { data: finalAdmins } = await sb
        .from('profiles')
        .select('id, full_name, email, user_type')
        .eq('user_type', 'admin');

    console.log(`  Total de contas admin: ${finalAdmins?.length || 0}`);
    (finalAdmins || []).forEach(p => {
        console.log(`  [ADMIN] ${p.full_name} | ${p.email || 'sem email'} | ${p.id.slice(0,8)}...`);
    });

    console.log('\n' + '='.repeat(55));
    console.log('  Implementacao concluida!');
    console.log('='.repeat(55));
}

run().catch(e => console.error('FATAL:', e));
