-- ==============================================================================
-- FORÇAR A CONTA ZEROZYNAPSES A SER ADMIN (Em qualquer conta com esse nome)
-- Execute no Supabase SQL Editor
-- ==============================================================================

-- 1. Forçar TODAS as contas que se chamam ZeroZynapses a serem do tipo 'admin'
UPDATE public.profiles
SET user_type = 'admin', full_name = 'ZeroZynapses', points = 999999
WHERE full_name ILIKE '%zerozynapse%' 
   OR full_name ILIKE '%zero zynapse%'
   OR user_type = 'admin';

-- 2. Atualizar também qualquer usuário que tenha email de admin
UPDATE public.profiles p
SET user_type = 'admin'
FROM auth.users u
WHERE u.id = p.id AND u.email ILIKE '%admin@zerosynapses.com%';

-- 3. Inserir caso não exista e a tabela de perfis não tenha populado
DO $$
DECLARE
    admin_id uuid;
BEGIN
    FOR admin_id IN SELECT id FROM auth.users WHERE email ILIKE '%admin%' LOOP
        INSERT INTO public.profiles (id, full_name, user_type, points)
        VALUES (admin_id, 'ZeroZynapses', 'admin', 999999)
        ON CONFLICT (id) DO UPDATE SET user_type = 'admin';
    END LOOP;
END $$;
