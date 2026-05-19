CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 0.1 Adicionar colunas faltantes na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS specialty text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS city text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS address text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS points int DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS price_unit text;

-- 0.2 Garantir que a Busca consiga ler os perfis (Desbloqueio de RLS)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura publica de perfis" ON public.profiles;
CREATE POLICY "Permitir leitura publica de perfis" ON public.profiles FOR SELECT USING (true);

DO $$
DECLARE
    prof1_id uuid := gen_random_uuid();
    prof2_id uuid := gen_random_uuid();
    prof3_id uuid := gen_random_uuid();
    cli1_id uuid := gen_random_uuid();
    cli2_id uuid := gen_random_uuid();
    cli3_id uuid := gen_random_uuid();
BEGIN
    -- 1. Criação na tabela oficial de usuários (auth.users)
    -- As senhas para todos serão: senha123
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
    VALUES
    (prof1_id, '00000000-0000-0000-0000-000000000000', 'ana.cabeleireira@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Ana Cabeleireira"}', now(), now(), 'authenticated', 'authenticated', ''),
    (prof2_id, '00000000-0000-0000-0000-000000000000', 'carlos.barbeiro@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Carlos Barbeiro"}', now(), now(), 'authenticated', 'authenticated', ''),
    (prof3_id, '00000000-0000-0000-0000-000000000000', 'mariana.salao@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Mariana Salão"}', now(), now(), 'authenticated', 'authenticated', ''),
    (cli1_id, '00000000-0000-0000-0000-000000000000', 'joao.cliente@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"client","full_name":"João Pereira"}', now(), now(), 'authenticated', 'authenticated', ''),
    (cli2_id, '00000000-0000-0000-0000-000000000000', 'maria.cliente@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"client","full_name":"Maria Costa"}', now(), now(), 'authenticated', 'authenticated', ''),
    (cli3_id, '00000000-0000-0000-0000-000000000000', 'lucas.cliente@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"client","full_name":"Lucas Silva"}', now(), now(), 'authenticated', 'authenticated', '');

    -- 2. Criação na tabela pública de perfis para aparecer na Busca
    INSERT INTO public.profiles (id, full_name, user_type, category, specialty, city, address, points, price, price_unit)
    VALUES
    (prof1_id, 'Ana Cabeleireira', 'professional', 'Cabeleireiro', 'Corte e Pintura', 'São Paulo, SP', 'Av Paulista, 1000', 0, 80, 'corte'),
    (prof2_id, 'Carlos Barbeiro', 'professional', 'Cabeleireiro', 'Corte e Barba', 'São Paulo, SP', 'Rua Augusta, 500', 0, 50, 'corte'),
    (prof3_id, 'Mariana Salão', 'professional', 'Cabeleireiro', 'Corte e Escova', 'São Paulo, SP', 'Av Faria Lima, 200', 0, 100, 'serviço'),
    (cli1_id, 'João Pereira', 'client', null, null, 'São Paulo, SP', 'Rua A, 123', 10, null, null),
    (cli2_id, 'Maria Costa', 'client', null, null, 'São Paulo, SP', 'Rua B, 456', 10, null, null),
    (cli3_id, 'Lucas Silva', 'client', null, null, 'São Paulo, SP', 'Rua C, 789', 10, null, null)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        user_type = EXCLUDED.user_type,
        category = EXCLUDED.category,
        specialty = EXCLUDED.specialty,
        city = EXCLUDED.city,
        address = EXCLUDED.address,
        points = EXCLUDED.points,
        price = EXCLUDED.price,
        price_unit = EXCLUDED.price_unit;
END $$;
