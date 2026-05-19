-- SCRIPT DE SINCRONIZAÇÃO TOTAL (DATA.JS -> SUPABASE)
-- Este script cria os usuários reais no Auth e no Public para os profissionais do app.

DO $$
DECLARE
    -- IDs fixos para os profissionais (para bater com o DATA.js se possível, ou apenas UUIDs novos)
    marcos_id uuid := 'a1b2c3d4-e5f6-4a5b-8c9d-0e1f2a3b4c5d';
    juliana_id uuid := 'b2c3d4e5-f6a7-4b6c-9d8e-1f0a2b3c4d5e';
    rodrigo_id uuid := 'c3d4e5f6-a7b8-4c7d-0e1f-2a3b4c5d6e7f';
BEGIN
    -- 1. Criar no Auth (senhas padrão: senha123)
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, role, aud)
    VALUES
    (marcos_id, '00000000-0000-0000-0000-000000000000', 'marcos@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Marcos Silva"}', 'authenticated', 'authenticated'),
    (juliana_id, '00000000-0000-0000-0000-000000000000', 'juliana@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Juliana Beauty"}', 'authenticated', 'authenticated'),
    (rodrigo_id, '00000000-0000-0000-0000-000000000000', 'rodrigo@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Rodrigo Barber"}', 'authenticated', 'authenticated')
    ON CONFLICT (id) DO NOTHING;

    -- 2. Criar no Profiles
    INSERT INTO public.profiles (id, full_name, user_type, category, specialty, city)
    VALUES
    (marcos_id, 'Marcos Silva', 'professional', 'Cabeleireiro', 'Corte Masculino', 'São Paulo, SP'),
    (juliana_id, 'Juliana Beauty', 'professional', 'Estética', 'Design de Sobrancelhas', 'São Paulo, SP'),
    (rodrigo_id, 'Rodrigo Barber', 'professional', 'Barbearia', 'Barba e Cabelo', 'São Paulo, SP')
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        user_type = EXCLUDED.user_type;
END $$;
