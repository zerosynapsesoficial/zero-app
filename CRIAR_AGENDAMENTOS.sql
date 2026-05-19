-- ==========================================
-- SCRIPT PARA CRIAR SISTEMA DE AGENDAMENTOS
-- ==========================================

-- 1. Cria a tabela de agendamentos
CREATE TABLE IF NOT EXISTS public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Habilita RLS
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

-- 3. Limpa políticas antigas
DROP POLICY IF EXISTS "Todos podem ver agendamentos" ON public.appointments;
DROP POLICY IF EXISTS "Qualquer um pode inserir agendamento" ON public.appointments;

-- 4. Cria políticas abertas (para simplificar)
CREATE POLICY "Todos podem ver agendamentos" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Qualquer um pode inserir agendamento" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer um pode alterar agendamento" ON public.appointments FOR UPDATE USING (true);

-- 5. Habilita Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;
