-- ==============================================================================
-- SCRIPT DEFINITIVO PARA RESTAURAR O ADMIN (ZeroZynapses)
-- Cole TUDO no SQL Editor do Supabase e clique em RUN
-- Link: https://supabase.com/dashboard/project/oryguljbqcphbtiapvwk/sql/new
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

DO $$
DECLARE
    existing_email TEXT;
    admin_id UUID := 'e33bdd17-f6bc-4c72-82cf-c3f76124aca0';
    new_pass TEXT := 'ZP@147896325@ZP';
BEGIN
    -- 1. Verificar se o usuário já existe em auth.users
    SELECT email INTO existing_email FROM auth.users WHERE id = admin_id;
    
    IF existing_email IS NOT NULL THEN
        RAISE NOTICE 'Usuário encontrado com email: %. Atualizando senha...', existing_email;
        
        UPDATE auth.users
        SET 
            email = 'lara.cabeleireira@teste.com',
            encrypted_password = crypt(new_pass, gen_salt('bf')),
            email_confirmed_at = now(),
            updated_at = now(),
            raw_app_meta_data = '{"provider":"email","providers":["email"]}',
            raw_user_meta_data = '{"full_name":"ZeroZynapses","user_type":"admin"}'
        WHERE id = admin_id;
        
        RAISE NOTICE 'Senha atualizada com sucesso!';
    ELSE
        RAISE NOTICE 'Nenhum usuário encontrado com ID %. Criando novo...', admin_id;
        
        INSERT INTO auth.users (
            id,
            instance_id,
            email,
            encrypted_password,
            email_confirmed_at,
            raw_app_meta_data,
            raw_user_meta_data,
            created_at,
            updated_at,
            role,
            aud,
            confirmation_token
        ) VALUES (
            admin_id,
            '00000000-0000-0000-0000-000000000000',
            'lara.cabeleireira@teste.com',
            crypt(new_pass, gen_salt('bf')),
            now(),
            '{"provider":"email","providers":["email"]}',
            '{"full_name":"ZeroZynapses","user_type":"admin"}',
            now(),
            now(),
            'authenticated',
            'authenticated',
            ''
        );
        
        RAISE NOTICE 'Novo usuário admin criado com sucesso!';
    END IF;
END $$;

-- 2. Garantir que o perfil público está correto
INSERT INTO public.profiles (id, full_name, user_type, points)
VALUES ('e33bdd17-f6bc-4c72-82cf-c3f76124aca0', 'ZeroZynapses', 'admin', 999999)
ON CONFLICT (id) DO UPDATE 
SET full_name = 'ZeroZynapses', user_type = 'admin', points = 999999;

-- 3. Verificar resultado final
SELECT u.id, u.email, u.email_confirmed_at, p.full_name, p.user_type
FROM auth.users u
JOIN public.profiles p ON u.id = p.id
WHERE p.user_type = 'admin';
