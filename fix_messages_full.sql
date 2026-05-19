-- =====================================================
-- ZERO APP - FIX COMPLETO DO SISTEMA DE MENSAGENS
-- Execute este script no SQL Editor do Supabase
-- =====================================================

-- 1. Garantir que a tabela messages existe com estrutura correta
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_read boolean DEFAULT false
);

-- 2. Habilitar RLS
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Remover políticas antigas
DROP POLICY IF EXISTS "Users can see messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can see all messages" ON public.messages;
DROP POLICY IF EXISTS "Admins can update messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update read status" ON public.messages;

-- 4. POLÍTICA SELECT: Usuários veem suas mensagens; Admin vê TODAS
CREATE POLICY "Users can see messages they sent or received"
ON public.messages
FOR SELECT
USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- 5. POLÍTICA INSERT: Qualquer autenticado pode enviar (sender deve ser o próprio)
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (auth.uid() = sender_id);

-- 6. POLÍTICA UPDATE: Usuário pode marcar como lido se for o receiver; admin pode tudo
CREATE POLICY "Users can update read status"
ON public.messages
FOR UPDATE
USING (
    auth.uid() = receiver_id
    OR EXISTS (
        SELECT 1 FROM public.profiles 
        WHERE id = auth.uid() 
        AND user_type = 'admin'
    )
);

-- 7. Habilitar Realtime para a tabela messages (necessário para tempo real)
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 8. Garantir que a coluna user_type existe na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'client';

-- 9. Verificar/Criar o perfil ZeroZynapses como admin
-- (substitua o email abaixo se necessário)
DO $$
DECLARE
    admin_uid uuid;
BEGIN
    -- Busca o usuário admin pelo email
    SELECT id INTO admin_uid 
    FROM auth.users 
    WHERE email = 'admin@zerosynapses.com'
    LIMIT 1;
    
    IF admin_uid IS NOT NULL THEN
        -- Garante que o perfil existe e é admin
        INSERT INTO public.profiles (id, full_name, user_type, points)
        VALUES (admin_uid, 'ZeroZynapses', 'admin', 999999)
        ON CONFLICT (id) DO UPDATE 
        SET full_name = 'ZeroZynapses', user_type = 'admin';
        
        RAISE NOTICE 'Admin ZeroZynapses configurado com sucesso. ID: %', admin_uid;
    ELSE
        RAISE NOTICE 'AVISO: Usuário admin@zerosynapses.com não encontrado em auth.users. Faça login primeiro pelo app.';
    END IF;
END $$;

-- 10. Verificar resultado
SELECT id, full_name, user_type, points 
FROM public.profiles 
WHERE user_type = 'admin' OR full_name ILIKE '%zero%';
