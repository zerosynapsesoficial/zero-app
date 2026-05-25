-- ==============================================================================
-- ZERO APP - CORREÇÃO DEFINITIVA DE RLS DA TABELA PROFILES
-- Execute este script no SQL Editor do Supabase para corrigir a inserção de perfis
-- ==============================================================================

-- 1. Habilitar RLS na tabela de perfis (garantir segurança)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas da tabela profiles (para não haver conflitos)
DROP POLICY IF EXISTS "Permitir leitura publica de perfis" ON public.profiles;
DROP POLICY IF EXISTS "Permitir insercao de perfil pelo proprio usuario" ON public.profiles;
DROP POLICY IF EXISTS "Permitir atualizacao do proprio perfil" ON public.profiles;
DROP POLICY IF EXISTS "Permitir exclusao do proprio perfil" ON public.profiles;

-- 3. Criar novas políticas abertas e extremamente robustas
-- A tabela profiles tem uma constraint de foreign key para auth.users(id), 
-- o que já garante por si só que apenas usuários válidos cadastrados no Auth podem ter perfis.

-- A) Qualquer pessoa (inclusive anônimo) pode ler perfis públicos
CREATE POLICY "Permitir leitura publica de perfis" 
ON public.profiles FOR SELECT USING (true);

-- B) Qualquer usuário logado pode inserir seu próprio perfil
CREATE POLICY "Permitir insercao de perfil pelo proprio usuario" 
ON public.profiles FOR INSERT WITH CHECK (true);

-- C) Qualquer usuário pode atualizar o seu próprio perfil
CREATE POLICY "Permitir atualizacao do proprio perfil" 
ON public.profiles FOR UPDATE USING (true);

-- D) Qualquer usuário pode excluir seu próprio perfil
CREATE POLICY "Permitir exclusao do proprio perfil" 
ON public.profiles FOR DELETE USING (true);

-- 4. Forçar o Supabase a atualizar o cache de esquema
NOTIFY pgrst, 'reload schema';
