-- Adiciona colunas para configuração de visitas profissionais na tabela profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS work_mode text DEFAULT 'estabelecimento';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS taxa_deslocamento numeric DEFAULT 0;
