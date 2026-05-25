-- =====================================================
-- GARANTIR QUE zerosynapsesoficial@gmail.com seja ADM
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- 1. Atualizar perfil existente para admin (se já existe no banco)
UPDATE public.profiles
SET 
    user_type = 'admin',
    full_name = COALESCE(NULLIF(full_name, ''), 'ZeroZynapses Oficial')
WHERE email = 'zerosynapsesoficial@gmail.com';

-- 2. Garantir todos os emails admin conhecidos
UPDATE public.profiles
SET user_type = 'admin'
WHERE email IN (
    'admin@zerosynapses.com',
    'zerosynapsesoficial@gmail.com',
    'lara.cabeleireira@teste.com'
)
AND user_type != 'admin';

-- 3. Verificar resultado
SELECT id, full_name, email, user_type, created_at
FROM public.profiles
WHERE user_type = 'admin'
   OR email IN ('admin@zerosynapses.com', 'zerosynapsesoficial@gmail.com', 'lara.cabeleireira@teste.com')
ORDER BY created_at;

-- 4. Ver mensagens de suporte (para confirmar recebimento)
SELECT 
    m.id,
    m.content,
    m.created_at,
    s.full_name AS remetente,
    s.email AS email_remetente,
    r.full_name AS destinatario,
    r.user_type AS tipo_destinatario
FROM public.messages m
LEFT JOIN public.profiles s ON s.id = m.sender_id
LEFT JOIN public.profiles r ON r.id = m.receiver_id
WHERE r.user_type = 'admin' OR s.user_type = 'admin'
ORDER BY m.created_at DESC
LIMIT 20;
