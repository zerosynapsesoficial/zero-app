-- ==============================================================================
-- ZERO APP - ADICIONAR COLUNAS DE SERVIÇO E PREÇO EM AGENDAMENTOS
-- Execute este script no SQL Editor do Supabase para atualizar a tabela
-- ==============================================================================

-- 1. Adicionar colunas de serviço e preço na tabela de agendamentos
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS service_name text;
ALTER TABLE public.appointments ADD COLUMN IF NOT EXISTS price numeric;

-- 2. Forçar o Supabase a atualizar o cache de esquema (MUITO IMPORTANTE!)
NOTIFY pgrst, 'reload schema';
