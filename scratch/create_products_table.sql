-- ==============================================================================
-- ZERO APP - CRIAÇÃO DA TABELA DE PRODUTOS (PLANO PLUS)
-- Execute no SQL Editor do Supabase: https://supabase.com/dashboard
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.products (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    professional_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL,
    description text NOT NULL,
    price numeric(10, 2) NOT NULL,
    image_url text,
    created_at timestamp with time zone DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

-- Remover políticas antigas se existirem
DROP POLICY IF EXISTS "Permitir leitura publica de produtos" ON public.products;
DROP POLICY IF EXISTS "Permitir insercao de produtos pelos donos" ON public.products;
DROP POLICY IF EXISTS "Permitir exclusao de produtos pelos donos" ON public.products;

-- Criar novas políticas públicas permissivas
CREATE POLICY "Permitir leitura publica de produtos"
ON public.products FOR SELECT
USING (true);

CREATE POLICY "Permitir insercao de produtos pelos donos"
ON public.products FOR INSERT
WITH CHECK (auth.uid() = professional_id);

CREATE POLICY "Permitir exclusao de produtos pelos donos"
ON public.products FOR DELETE
USING (auth.uid() = professional_id);

-- Habilitar Realtime
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.products;
EXCEPTION WHEN OTHERS THEN
    NULL;
END $$;
