-- Script para criação da tabela de Notificações Dedicada
-- Este script expande o sistema de notificações para suportar alertas de sistema, agendamentos e mensagens.

CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    sender_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type TEXT DEFAULT 'info', -- 'message', 'appointment', 'system', 'promotion'
    link TEXT, -- Ex: #chat-msg/uuid ou #agendamento
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Habilitar Row Level Security (RLS)
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Políticas de Segurança
-- 1. Usuários só podem ver suas próprias notificações
CREATE POLICY "Users can view their own notifications" 
ON public.notifications FOR SELECT 
USING (auth.uid() = user_id);

-- 2. Usuários podem marcar suas notificações como lidas (update is_read)
CREATE POLICY "Users can update their own notifications" 
ON public.notifications FOR UPDATE 
USING (auth.uid() = user_id);

-- 3. Permitir que o sistema (service_role) ou o próprio usuário insira notificações (se necessário)
-- Nota: Geralmente notificações são inseridas via Triggers ou Edge Functions, 
-- mas permitiremos inserção para fins de teste.
CREATE POLICY "Enable insert for authenticated users" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- Índices para performance
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_is_read_idx ON public.notifications(is_read) WHERE is_read = false;

-- Comentários da Tabela
COMMENT ON TABLE public.notifications IS 'Tabela para armazenar notificações do sistema, mensagens e alertas para os usuários.';
-- Função para disparar notificação quando uma nova mensagem for inserida
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

-- Trigger para a tabela messages
DROP TRIGGER IF EXISTS tr_on_new_message ON public.messages;
CREATE TRIGGER tr_on_new_message
AFTER INSERT ON public.messages
FOR EACH ROW EXECUTE FUNCTION public.on_new_message_notification();
