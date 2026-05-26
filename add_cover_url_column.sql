-- Executar este script no SQL Editor do Supabase para adicionar a coluna necessária para o upload do QR Code
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS cover_url TEXT;
