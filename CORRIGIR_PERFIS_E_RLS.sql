-- ==============================================================================
-- ZERO APP - CORREÇÃO DE RLS E CHAVE ESTRANGEIRA DE PERFIS
-- Execute este script no SQL Editor do Supabase (https://supabase.com/dashboard)
-- ==============================================================================

-- 1. Permitir que usuários autenticados insiram seu próprio perfil se estiver faltando
DROP POLICY IF EXISTS "Permitir insercao de perfil proprio" ON public.profiles;
CREATE POLICY "Permitir insercao de perfil proprio" 
ON public.profiles FOR INSERT 
WITH CHECK (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'
));

-- 2. Permitir que qualquer usuário autenticado atualize seu próprio perfil
DROP POLICY IF EXISTS "Permitir atualizacao de perfil proprio" ON public.profiles;
CREATE POLICY "Permitir atualizacao de perfil proprio" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id OR EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND user_type = 'admin'
));

-- 3. Garantir leitura pública de todos os perfis
DROP POLICY IF EXISTS "Permitir leitura publica de perfis" ON public.profiles;
CREATE POLICY "Permitir leitura publica de perfis" 
ON public.profiles FOR SELECT 
USING (true);

-- 4. Forçar o Supabase a atualizar o cache de esquema
NOTIFY pgrst, 'reload schema';
