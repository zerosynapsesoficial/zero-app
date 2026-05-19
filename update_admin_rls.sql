-- Atualizar RLS para permitir que admins vejam todas as mensagens
-- Isso permite que a conta 'ZeroZynapses' monitore ou suporte todos os usuários.

DROP POLICY IF EXISTS "Users can see messages they sent or received" ON public.messages;
CREATE POLICY "Users can see messages they sent or received" 
ON public.messages 
FOR SELECT 
USING (
    auth.uid() = sender_id 
    OR auth.uid() = receiver_id 
    OR (SELECT user_type FROM public.profiles WHERE id = auth.uid()) = 'admin'
);

-- Garantir que admins também possam ver todos os perfis (já deve estar aberto, mas para garantir)
DROP POLICY IF EXISTS "Permitir leitura publica de perfis" ON public.profiles;
CREATE POLICY "Permitir leitura publica de perfis" ON public.profiles FOR SELECT USING (true);
