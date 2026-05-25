const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://oryguljbqcphbtiapvwk.supabase.co';
const SUPABASE_KEY = 'sb_publishable_WaiQI8T9aLg9iJkV3nEZBg_C5M24-Z5';

const sb = createClient(SUPABASE_URL, SUPABASE_KEY);

const TABLES = ['profiles', 'messages', 'appointments', 'notifications', 'products'];

async function runDiagnostic() {
    console.log('='.repeat(55));
    console.log('  DIAGNOSTICO SUPABASE - Zero App');
    console.log('='.repeat(55));
    console.log('URL:', SUPABASE_URL);
    console.log('Key:', SUPABASE_KEY.slice(0, 20) + '...');
    console.log('-'.repeat(55));

    // 1. Teste de conectividade basica
    console.log('\n[1] Testando conectividade basica...');
    try {
        const { data, error } = await sb.from('profiles').select('count', { count: 'exact', head: true });
        if (error) {
            console.log('  FALHOU:', error.message, '| code:', error.code);
        } else {
            console.log('  OK - Conexao estabelecida com sucesso!');
        }
    } catch (e) {
        console.log('  ERRO CRITICO:', e.message);
    }

    // 2. Verificar cada tabela
    console.log('\n[2] Verificando tabelas...');
    for (const table of TABLES) {
        try {
            const { count, error } = await sb
                .from(table)
                .select('*', { count: 'exact', head: true });

            if (error) {
                if (error.code === '42P01') {
                    console.log(`  [X] ${table.padEnd(15)} - TABELA NAO EXISTE`);
                } else if (error.code === 'PGRST301' || error.message.includes('permission denied')) {
                    console.log(`  [!] ${table.padEnd(15)} - SEM PERMISSAO (RLS bloqueando anon)`);
                } else if (error.message.includes('API key')) {
                    console.log(`  [!] ${table.padEnd(15)} - CHAVE INVALIDA: ${error.message}`);
                } else {
                    console.log(`  [X] ${table.padEnd(15)} - ERRO: ${error.message} (${error.code})`);
                }
            } else {
                console.log(`  [OK] ${table.padEnd(14)} - Acessivel (${count ?? '?'} registros)`);
            }
        } catch (e) {
            console.log(`  [X] ${table.padEnd(15)} - EXCECAO: ${e.message}`);
        }
    }

    // 3. Verificar Auth (anon nao pode listar usuarios, mas pode checar sessao)
    console.log('\n[3] Verificando Auth service...');
    try {
        const { data: session, error: authErr } = await sb.auth.getSession();
        if (authErr) {
            console.log('  Auth getSession ERRO:', authErr.message);
        } else {
            console.log('  Auth service OK - sessao atual:', session?.session ? 'LOGADO' : 'Nenhuma sessao ativa (esperado para anon)');
        }
    } catch (e) {
        console.log('  Auth EXCECAO:', e.message);
    }

    // 4. Verificar URL e KEY
    console.log('\n[4] Verificando configuracoes...');
    const urlOk = SUPABASE_URL.includes('supabase.co') && SUPABASE_URL.startsWith('https://');
    const keyOk = SUPABASE_KEY.startsWith('sb_publishable_') || SUPABASE_KEY.startsWith('eyJ');
    console.log('  URL valida:', urlOk ? 'SIM' : 'NAO');
    console.log('  Key formato:', keyOk ? 'OK' : 'SUSPEITO');
    console.log('  Proxy Vercel: /api/supabase -> ' + SUPABASE_URL);

    // 5. Teste de insert/select rapido (sem dados reais)
    console.log('\n[5] Testando permissoes de leitura em profiles...');
    try {
        const { data, error } = await sb
            .from('profiles')
            .select('id, full_name, user_type')
            .limit(3);

        if (error) {
            console.log('  SELECT ERRO:', error.message);
        } else {
            console.log('  SELECT OK -', data.length, 'registros retornados:');
            data.forEach(p => console.log(`    - [${p.user_type}] ${p.full_name} (${p.id?.slice(0,8)}...)`));
        }
    } catch (e) {
        console.log('  SELECT EXCECAO:', e.message);
    }

    console.log('\n' + '='.repeat(55));
    console.log('  Diagnostico concluido.');
    console.log('='.repeat(55));
}

runDiagnostic().catch(e => console.error('FATAL:', e));
