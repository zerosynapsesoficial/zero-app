-- ==========================================
-- SCRIPT PARA ATIVAR O TEMPO REAL (REALTIME)
-- ==========================================

-- 1. Ativar o Realtime na tabela de mensagens
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- 2. Ativar o Realtime na tabela de notificações
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- 3. Ativar o Realtime na tabela de perfis (caso precise)
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;

-- Nota: Se der um erro dizendo que a tabela "já faz parte da publicação",
-- ignore o erro, pois significa que já estava ativado.
