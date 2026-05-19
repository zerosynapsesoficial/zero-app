-- SCRIPT PARA CONFIGURAR O CHAT E SUPORTE (Execute no SQL Editor do Supabase)

-- 1. Criar a tabela de mensagens (se não existir)
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_read boolean DEFAULT false
);

-- 2. Habilitar RLS na tabela de mensagens
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 3. Políticas de segurança para mensagens
DROP POLICY IF EXISTS "Users can see messages they sent or received" ON public.messages;
CREATE POLICY "Users can see messages they sent or received" 
ON public.messages 
FOR SELECT 
USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages" 
ON public.messages 
FOR INSERT 
WITH CHECK (auth.uid() = sender_id);

-- 4. Garantir que a tabela profiles tenha a coluna user_type
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS user_type text DEFAULT 'client';

-- 5. CRIAR OU ATUALIZAR O PERFIL 'ZeroZynapses' COMO ADMIN
-- Este script associa o seu usuário logado (ou um usuário teste) ao perfil de suporte oficial.
-- Execute isto para garantir que as mensagens de suporte tenham um destino.

-- Transforma o primeiro usuário encontrado em 'ZeroZynapses' Admin (para testes)
-- Ou você pode substituir auth.uid() pelo seu ID real se souber qual é.
UPDATE public.profiles 
SET full_name = 'ZeroZynapses', user_type = 'admin' 
WHERE id = (SELECT id FROM profiles LIMIT 1); 

-- Nota: Se você já estiver logado, pode usar este para garantir que VOCÊ seja o admin de teste:
-- UPDATE public.profiles SET full_name = 'ZeroZynapses', user_type = 'admin' WHERE id = 'SEU_UUID_AQUI';

