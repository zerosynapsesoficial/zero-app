-- ==========================================
-- SCRIPT PARA ATIVAR O ARMAZENAMENTO DE FOTOS
-- ==========================================

-- 1. Criar o bucket público 'avatars'
INSERT INTO storage.buckets (id, name, public) 
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

-- 2. Limpar políticas antigas (se houver)
DROP POLICY IF EXISTS "Avatar view" ON storage.objects;
DROP POLICY IF EXISTS "Avatar upload" ON storage.objects;
DROP POLICY IF EXISTS "Avatar update" ON storage.objects;
DROP POLICY IF EXISTS "Avatar delete" ON storage.objects;

-- 3. Permitir que qualquer pessoa veja as fotos
CREATE POLICY "Avatar view" ON storage.objects FOR SELECT USING (bucket_id = 'avatars');

-- 4. Permitir que usuários logados façam upload de fotos
CREATE POLICY "Avatar upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'avatars' AND auth.role() = 'authenticated');

-- 5. Permitir que os usuários atualizem suas próprias fotos
CREATE POLICY "Avatar update" ON storage.objects FOR UPDATE USING (bucket_id = 'avatars' AND auth.uid() = owner);

-- 6. Permitir que os usuários deletem suas próprias fotos
CREATE POLICY "Avatar delete" ON storage.objects FOR DELETE USING (bucket_id = 'avatars' AND auth.uid() = owner);
