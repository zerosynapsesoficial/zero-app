-- FORÇA A CRIAÇÃO DE UM ADMIN (Mesmo sem saber o email)
-- Execute isso no Supabase SQL Editor

DO $$
DECLARE
    primeiro_usuario_id uuid;
BEGIN
    -- Pega o primeiro usuário existente na tabela auth.users
    SELECT id INTO primeiro_usuario_id FROM auth.users ORDER BY created_at ASC LIMIT 1;

    IF primeiro_usuario_id IS NOT NULL THEN
        -- Garante que ele exista na tabela profiles
        INSERT INTO public.profiles (id, full_name, user_type, points)
        VALUES (primeiro_usuario_id, 'ZeroZynapses Support', 'admin', 999999)
        ON CONFLICT (id) DO UPDATE 
        SET full_name = 'ZeroZynapses Support', user_type = 'admin';

        RAISE NOTICE 'Usuário % foi definido como admin do suporte com sucesso!', primeiro_usuario_id;
    ELSE
        RAISE NOTICE 'Nenhum usuário encontrado no sistema. Por favor, crie uma conta no app primeiro.';
    END IF;
END $$;

-- Lista os admins atuais para verificar
SELECT id, full_name, user_type, email 
FROM public.profiles p
LEFT JOIN auth.users u ON u.id = p.id
WHERE user_type = 'admin' OR full_name ILIKE '%zero%';
