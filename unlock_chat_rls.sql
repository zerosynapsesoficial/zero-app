-- ==============================================================================
-- ZERO APP - DESBLOQUEIO TOTAL PARA MENSAGENS E NOTIFICAÇÕES (MOCK/TESTE)
-- ==============================================================================

-- Remover políticas restritivas de Inserção que estavam bloqueando contas de teste (Mock)
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON public.notifications;
DROP POLICY IF EXISTS "Users can view their own notifications" ON public.notifications;

-- 1. Permitir que qualquer conta (mesmo contas de teste sem login oficial) envie mensagens
CREATE POLICY "Permitir insercao livre de mensagens"
ON public.messages FOR INSERT
WITH CHECK (true);

-- 2. Permitir que qualquer conta insira notificações (para o trigger funcionar sem bloqueios)
CREATE POLICY "Permitir insercao livre de notificacoes" 
ON public.notifications FOR INSERT 
WITH CHECK (true);

-- 3. Permitir que qualquer um leia notificações para facilitar o teste local
CREATE POLICY "Permitir leitura livre de notificacoes" 
ON public.notifications FOR SELECT 
USING (true);

-- 4. Permitir que qualquer um leia mensagens para evitar que desapareçam no modo de teste
DROP POLICY IF EXISTS "Users can see messages they sent or received" ON public.messages;
CREATE POLICY "Permitir leitura livre de mensagens"
ON public.messages FOR SELECT
USING (true);
