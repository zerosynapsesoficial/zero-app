-- Script para criar 4 Perfis Profissionais e 4 Perfis Clientes (Comunidade Santa Edwiges)
-- Senha padrão para todos: santaedwiges2024

DO $$
DECLARE
    -- IDs para Profissionais
    prof1_id uuid := gen_random_uuid();
    prof2_id uuid := gen_random_uuid();
    prof3_id uuid := gen_random_uuid();
    prof4_id uuid := gen_random_uuid();
    -- IDs para Clientes
    cli1_id uuid := gen_random_uuid();
    cli2_id uuid := gen_random_uuid();
    cli3_id uuid := gen_random_uuid();
    cli4_id uuid := gen_random_uuid();
BEGIN
    -- 1. Inserção na tabela auth.users (Supabase Auth)
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
    VALUES
    -- Profissionais
    (prof1_id, '00000000-0000-0000-0000-000000000000', 'marcos.cabeleireiro@zero.com', crypt('santaedwiges2024', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Marcos Silva"}', now(), now(), 'authenticated', 'authenticated', ''),
    (prof2_id, '00000000-0000-0000-0000-000000000000', 'ricardo.barbeiro@zero.com', crypt('santaedwiges2024', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Ricardo Barber"}', now(), now(), 'authenticated', 'authenticated', ''),
    (prof3_id, '00000000-0000-0000-0000-000000000000', 'juliana.estetica@zero.com', crypt('santaedwiges2024', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Juliana Beauty"}', now(), now(), 'authenticated', 'authenticated', ''),
    (prof4_id, '00000000-0000-0000-0000-000000000000', 'bruno.estilo@zero.com', crypt('santaedwiges2024', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Bruno Style"}', now(), now(), 'authenticated', 'authenticated', ''),
    -- Clientes
    (cli1_id, '00000000-0000-0000-0000-000000000000', 'felipe.cliente@zero.com', crypt('santaedwiges2024', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"client","full_name":"Felipe Souza"}', now(), now(), 'authenticated', 'authenticated', ''),
    (cli2_id, '00000000-0000-0000-0000-000000000000', 'amanda.cliente@zero.com', crypt('santaedwiges2024', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"client","full_name":"Amanda Lima"}', now(), now(), 'authenticated', 'authenticated', ''),
    (cli3_id, '00000000-0000-0000-0000-000000000000', 'thiago.cliente@zero.com', crypt('santaedwiges2024', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"client","full_name":"Thiago Oliveira"}', now(), now(), 'authenticated', 'authenticated', ''),
    (cli4_id, '00000000-0000-0000-0000-000000000000', 'camila.cliente@zero.com', crypt('santaedwiges2024', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"client","full_name":"Camila Santos"}', now(), now(), 'authenticated', 'authenticated', '');

    -- 2. Inserção na tabela public.profiles
    INSERT INTO public.profiles (id, full_name, user_type, category, specialty, city, address, points, price, price_unit)
    VALUES
    -- Profissionais (Endereços solicitados)
    (prof1_id, 'Marcos Silva', 'professional', 'Salão de Cabeleireiros', 'Corte Masculino e Feminino', 'Santa Edwiges', 'Rua das Acácias, 118', 0, 45, 'corte'),
    (prof2_id, 'Ricardo Barber', 'professional', 'Barbearia', 'Barba Premium e Corte Degradê', 'Santa Edwiges', 'Avenida Bento de Souza, 247', 0, 35, 'serviço'),
    (prof3_id, 'Juliana Beauty', 'professional', 'Estúdio de Beleza(Espaço)', 'Limpeza de Pele e Maquiagem', 'Santa Edwiges', 'Rua José Ferreira Lima, 62', 0, 120, 'sessão'),
    (prof4_id, 'Bruno Style', 'professional', 'Barbearia e Salão', 'Tranças e Mega Hair', 'Santa Edwiges', 'Travessa Santa Helena, 34', 0, 80, 'hora'),
    -- Clientes (Endereços solicitados)
    (cli1_id, 'Felipe Souza', 'client', null, null, 'Santa Edwiges', 'Rua das Acácias, 108', 50, null, null),
    (cli2_id, 'Amanda Lima', 'client', null, null, 'Santa Edwiges', 'Avenida Bento de Souza, 277', 120, null, null),
    (cli3_id, 'Thiago Oliveira', 'client', null, null, 'Santa Edwiges', 'Rua José Ferreira Lima, 66', 30, null, null),
    (cli4_id, 'Camila Santos', 'client', null, null, 'Santa Edwiges', 'Travessa Santa Helena, 33', 80, null, null)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        user_type = EXCLUDED.user_type,
        address = EXCLUDED.address,
        specialty = EXCLUDED.specialty;
END $$;
