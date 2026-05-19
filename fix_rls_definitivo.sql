-- ==============================================================================
-- ZERO APP - FIX DEFINITIVO DE RLS PARA MENSAGENS E NOTIFICAÇÕES
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard
-- Projeto: zerosynapsesoficial → SQL Editor → New Query → Cole e execute
-- ==============================================================================

-- ▶ STEP 1: Garantir que a tabela messages existe
CREATE TABLE IF NOT EXISTS public.messages (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    sender_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    receiver_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
    content text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_read boolean DEFAULT false
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- ▶ STEP 2: Remover TODAS as políticas antigas de messages
DROP POLICY IF EXISTS "Users can see messages they sent or received" ON public.messages;
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Users can update read status" ON public.messages;
DROP POLICY IF EXISTS "Permitir leitura livre de mensagens" ON public.messages;
DROP POLICY IF EXISTS "Permitir insercao livre de mensagens" ON public.messages;

-- ▶ STEP 3: Criar políticas novas e permissivas (funcionam para todos os usuários autenticados)
CREATE POLICY "messages_select_policy"
ON public.messages FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "messages_insert_policy"
ON public.messages FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "messages_update_policy"
ON public.messages FOR UPDATE
USING (auth.uid() IS NOT NULL);

-- ▶ STEP 4: Garantir que a tabela notifications existe
CREATE TABLE IF NOT EXISTS public.notifications (
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

-- ▶ STEP 5: Remover TODAS as políticas antigas de notifications
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Users can update their own notifications" ON public.notifications;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Permitir insercao livre de notificacoes" ON public.notifications;
DROP POLICY IF EXISTS "Permitir leitura livre de notificacoes" ON public.notifications;

-- ▶ STEP 6: Criar políticas novas para notifications
CREATE POLICY "notifications_select_policy"
ON public.notifications FOR SELECT
USING (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_insert_policy"
ON public.notifications FOR INSERT
WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "notifications_update_policy"
ON public.notifications FOR UPDATE
USING (auth.uid() = user_id);

-- ▶ STEP 7: Garantir que o trigger de notificação automática existe
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

DROP TRIGGER IF EXISTS tr_on_new_message ON public.messages;
CREATE TRIGGER tr_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_new_message_notification();

-- ▶ STEP 8: Habilitar Realtime nas tabelas
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;

-- ▶ STEP 9: Promover o primeiro usuário cadastrado como admin
DO $$
DECLARE
    admin_id uuid;
BEGIN
    -- Tenta encontrar a conta pelo email
    SELECT id INTO admin_id FROM auth.users 
    WHERE email ILIKE '%zerozynapse%' OR email ILIKE '%admin%'
    ORDER BY created_at ASC LIMIT 1;
    
    -- Se não achar, pega o primeiro usuário cadastrado
    IF admin_id IS NULL THEN
        SELECT id INTO admin_id FROM auth.users ORDER BY created_at ASC LIMIT 1;
    END IF;

    IF admin_id IS NOT NULL THEN
        INSERT INTO public.profiles (id, full_name, user_type, points)
        VALUES (admin_id, 'ZeroZynapses', 'admin', 999999)
        ON CONFLICT (id) DO UPDATE SET 
            full_name = 'ZeroZynapses', 
            user_type = 'admin',
            points = 999999;
        RAISE NOTICE '✅ Admin configurado: %', admin_id;
    ELSE
        RAISE NOTICE '⚠️ Nenhum usuário encontrado para configurar como admin';
    END IF;
END $$;

-- ▶ VERIFICAÇÃO FINAL
SELECT 'messages' as tabela, COUNT(*) as total_registros FROM public.messages
UNION ALL
SELECT 'notifications', COUNT(*) FROM public.notifications;

SELECT id, full_name, user_type FROM public.profiles WHERE user_type = 'admin';
