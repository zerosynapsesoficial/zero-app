-- ==============================================================================
-- ZERO APP - CORREÇÃO DEFINITIVA DE MENSAGENS E PERFIS
-- Execute este script no SQL Editor do Supabase (Copie e cole tudo)
-- ==============================================================================

-- 1. GARANTIR QUE TODOS PODEM LER OS PERFIS (Crucial para achar o Admin)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Permitir leitura publica de perfis" ON public.profiles;
CREATE POLICY "Permitir leitura publica de perfis" 
ON public.profiles FOR SELECT USING (true);

-- 2. LIMPEZA E RECRIACAO DAS TABELAS DE CHAT
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_read boolean DEFAULT false
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see messages they sent or received"
ON public.messages FOR SELECT
USING (
    auth.uid() = sender_id OR auth.uid() = receiver_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
);

CREATE POLICY "Users can send messages"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() = sender_id);

CREATE POLICY "Users can update read status"
ON public.messages FOR UPDATE
USING (
    auth.uid() = receiver_id OR 
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin')
);

CREATE TABLE public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info',
    link TEXT,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Enable insert for authenticated users" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- 3. CRIAR O GATILHO (TRIGGER) PARA NOTIFICAÇÕES
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

CREATE TRIGGER tr_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_new_message_notification();

-- 4. ATIVAR REALTIME
BEGIN;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
  ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN
END;

-- 5. FORÇAR A CONTA ZEROZYNAPSES COMO ADMIN SUPREMO
DO $$
DECLARE
    primeiro_usuario_id uuid;
BEGIN
    SELECT id INTO primeiro_usuario_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    IF primeiro_usuario_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, full_name, user_type, points)
        VALUES (primeiro_usuario_id, 'ZeroZynapses', 'admin', 999999)
        ON CONFLICT (id) DO UPDATE SET full_name = 'ZeroZynapses', user_type = 'admin';
    END IF;
END $$;
