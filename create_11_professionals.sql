-- SQL para adicionar 11 contas profissionais na região do CEP 04913-000 (Jardim São Luís, São Paulo, SP)
-- Contendo avaliações variadas (baixas e altas estrelas)
-- Para executar: Copie o conteúdo deste script e execute-o no Editor SQL do seu Painel do Supabase.

DO $$
DECLARE
    p_aline uuid := gen_random_uuid();
    p_bruno uuid := gen_random_uuid();
    p_carla uuid := gen_random_uuid();
    p_diego uuid := gen_random_uuid();
    p_eliane uuid := gen_random_uuid();
    p_felipe uuid := gen_random_uuid();
    p_gisele uuid := gen_random_uuid();
    p_hugo uuid := gen_random_uuid();
    p_isabela uuid := gen_random_uuid();
    p_joao uuid := gen_random_uuid();
    p_kelly uuid := gen_random_uuid();
BEGIN
    -- 1. Inserir os usuários na tabela oficial de autenticação (auth.users)
    -- A senha padrão para todos é: senha123
    INSERT INTO auth.users (id, instance_id, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, role, aud, confirmation_token)
    VALUES
    (p_aline, '00000000-0000-0000-0000-000000000000', 'aline.ribeiro@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Aline Ribeiro"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_bruno, '00000000-0000-0000-0000-000000000000', 'bruno.trancista@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Bruno Trancista"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_carla, '00000000-0000-0000-0000-000000000000', 'carla.nails@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Carla Nails"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_diego, '00000000-0000-0000-0000-000000000000', 'diego.barbearia@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Diego Barbearia"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_eliane, '00000000-0000-0000-0000-000000000000', 'eliane.cabelos@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Eliane Cabelos"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_felipe, '00000000-0000-0000-0000-000000000000', 'felipe.studio@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Felipe Studio"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_gisele, '00000000-0000-0000-0000-000000000000', 'gisele.massagem@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Gisele Massagem"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_hugo, '00000000-0000-0000-0000-000000000000', 'hugo.cortes@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Hugo Cortes"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_isabela, '00000000-0000-0000-0000-000000000000', 'isabela.estetica@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Isabela Estética"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_joao, '00000000-0000-0000-0000-000000000000', 'joao.barber@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"João Barber"}', now(), now(), 'authenticated', 'authenticated', ''),
    (p_kelly, '00000000-0000-0000-0000-000000000000', 'kelly.visagismo@teste.com', crypt('senha123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"user_type":"professional","full_name":"Kelly Visagismo"}', now(), now(), 'authenticated', 'authenticated', '')
    ON CONFLICT (email) DO NOTHING;

    -- 2. Vincular IDs existentes da tabela auth.users se os emails já existiam
    -- Isso garante que o script possa ser rodado múltiplas vezes sem erros.
    SELECT id INTO p_aline FROM auth.users WHERE email = 'aline.ribeiro@teste.com';
    SELECT id INTO p_bruno FROM auth.users WHERE email = 'bruno.trancista@teste.com';
    SELECT id INTO p_carla FROM auth.users WHERE email = 'carla.nails@teste.com';
    SELECT id INTO p_diego FROM auth.users WHERE email = 'diego.barbearia@teste.com';
    SELECT id INTO p_eliane FROM auth.users WHERE email = 'eliane.cabelos@teste.com';
    SELECT id INTO p_felipe FROM auth.users WHERE email = 'felipe.studio@teste.com';
    SELECT id INTO p_gisele FROM auth.users WHERE email = 'gisele.massagem@teste.com';
    SELECT id INTO p_hugo FROM auth.users WHERE email = 'hugo.cortes@teste.com';
    SELECT id INTO p_isabela FROM auth.users WHERE email = 'isabela.estetica@teste.com';
    SELECT id INTO p_joao FROM auth.users WHERE email = 'joao.barber@teste.com';
    SELECT id INTO p_kelly FROM auth.users WHERE email = 'kelly.visagismo@teste.com';

    -- 3. Inserir ou atualizar na tabela pública de perfis (public.profiles)
    INSERT INTO public.profiles (id, full_name, user_type, category, specialty, city, address, phone, avatar_url, preferences, points, verified)
    VALUES
    (p_aline, 'Aline Ribeiro', 'professional', 'Estúdio de Beleza', 'Extensão de Cílios', 'São Paulo, SP', 'Rua Guilherme Valente, 310 - Jardim São Luís, São Paulo, SP', '(11) 98765-4321', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=200', '{"rating": 4.9}', 10, true),
    (p_bruno, 'Bruno Trancista', 'professional', 'Espaço', 'Tranças Nagô', 'São Paulo, SP', 'Avenida Maria Coelho Aguiar, 215 - Jardim São Luís, São Paulo, SP', '(11) 97654-3210', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=200', '{"rating": 2.8}', 10, false),
    (p_carla, 'Carla Nails', 'professional', 'Estúdio de Beleza', 'Unhas de Gel', 'São Paulo, SP', 'Estrada do M''Boi Mirim, 150 - Jardim São Luís, São Paulo, SP', '(11) 96543-2109', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=200', '{"rating": 3.2}', 10, false),
    (p_diego, 'Diego Barbearia', 'professional', 'Barbearia', 'Corte Degradê', 'São Paulo, SP', 'Rua Geraldo Fraga de Oliveira, 80 - Jardim São Luís, São Paulo, SP', '(11) 95432-1098', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=200', '{"rating": 4.7}', 10, true),
    (p_eliane, 'Eliane Cabelos', 'professional', 'Salão', 'Escova Progressiva', 'São Paulo, SP', 'Rua Chácara do Sol, 45 - Jardim São Luís, São Paulo, SP', '(11) 94321-0987', 'https://images.unsplash.com/photo-1508214751196-bcfd4ca60f91?auto=format&fit=crop&q=80&w=200', '{"rating": 3.4}', 10, false),
    (p_felipe, 'Felipe Studio', 'professional', 'Espaço', 'Tatuagem & Piercing', 'São Paulo, SP', 'Rua Estanislau Moniusko, 12 - Jardim São Luís, São Paulo, SP', '(11) 93210-9876', 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=200', '{"rating": 5.0}', 10, true),
    (p_gisele, 'Gisele Massagem', 'professional', 'Espaço', 'Massoterapia', 'São Paulo, SP', 'Rua Inácio Dias de Lemos, 55 - Jardim São Luís, São Paulo, SP', '(11) 92109-8765', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=200', '{"rating": 3.0}', 10, false),
    (p_hugo, 'Hugo Cortes', 'professional', 'Barbearia', 'Barboterapia', 'São Paulo, SP', 'Rua José Manoel de Sousa, 24 - Jardim São Luís, São Paulo, SP', '(11) 91098-7654', 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=200', '{"rating": 4.8}', 10, true),
    (p_isabela, 'Isabela Estética', 'professional', 'Estúdio de Beleza', 'Limpeza de Pele', 'São Paulo, SP', 'Rua Luís da Fonseca, 90 - Jardim São Luís, São Paulo, SP', '(11) 90987-6543', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=200', '{"rating": 3.5}', 10, false),
    (p_joao, 'João Barber', 'professional', 'Barbearia', 'Corte & Barba', 'São Paulo, SP', 'Rua Manoel Vitor de Jesus, 200 - Jardim São Luís, São Paulo, SP', '(11) 99876-5432', 'https://images.unsplash.com/photo-1552058544-f2b08422138a?auto=format&fit=crop&q=80&w=200', '{"rating": 4.9}', 10, true),
    (p_kelly, 'Kelly Visagismo', 'professional', 'Salão', 'Visagismo & Cor', 'São Paulo, SP', 'Rua Nelson de Oliveira, 110 - Jardim São Luís, São Paulo, SP', '(11) 98765-0123', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?auto=format&fit=crop&q=80&w=200', '{"rating": 5.0}', 10, true)
    ON CONFLICT (id) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        user_type = EXCLUDED.user_type,
        category = EXCLUDED.category,
        specialty = EXCLUDED.specialty,
        city = EXCLUDED.city,
        address = EXCLUDED.address,
        phone = EXCLUDED.phone,
        avatar_url = EXCLUDED.avatar_url,
        preferences = EXCLUDED.preferences,
        points = EXCLUDED.points,
        verified = EXCLUDED.verified;
END $$;
