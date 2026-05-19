-- Script de Correção para Notificações e Perfis
-- Este script garante que as colunas e relacionamentos necessários existam para o sistema de notificações.

-- 1. Garantir que a coluna avatar_url exista na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- 2. Recriar a tabela de notificações com o relacionamento correto para a busca de nomes/avatares
-- Primeiro, vamos remover se houver ambiguidades (opcional, mas seguro para este fix)
-- DROP TABLE IF EXISTS public.notifications; 

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL, -- Referencia profiles para permitir JOIN
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'message', 'appointment', 'system', 'promotion'
    link TEXT, -- Ex: #chat-msg/uuid ou #agendamento
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Habilitar RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de Segurança (Recriar para garantir que estão corretas)
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;
CREATE POLICY "Enable insert for authenticated users" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- 5. Inserir uma notificação de teste para o usuário atual (se houver um logado)
-- Nota: Isso só funcionará se você rodar isso no editor SQL do Supabase enquanto logado, 
-- ou pode remover esta parte se for rodar como script geral.
-- INSERT INTO public.notifications (user_id, title, content, type)
-- SELECT id, 'Bem-vindo!', 'Seu sistema de notificações está funcionando agora.', 'system'
-- FROM auth.users LIMIT 1; 

-- 6. Corrigir a função de trigger de mensagens para usar o sender_id correto se necessário
CREATE OR REPLACE FUNCTION public.on_new_message_notification()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.notifications (user_id, sender_id, title, content, type, link)
    VALUES (
        NEW.receiver_id,
        NEW.sender_id,
        'Nova Mensagem',
        NEW.content,
        'message',
        '#chat-msg/' || NEW.sender_id
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
