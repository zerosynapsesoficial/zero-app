-- 1. Apaga a tabela antiga com estrutura errada
DROP TABLE IF EXISTS public.appointments CASCADE;

-- 2. Recria a tabela com a coluna unificada 'appointment_date'
CREATE TABLE public.appointments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    professional_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    client_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'cancelled')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Habilita Políticas de Segurança (RLS)
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Todos podem ver agendamentos" ON public.appointments FOR SELECT USING (true);
CREATE POLICY "Qualquer um pode inserir agendamento" ON public.appointments FOR INSERT WITH CHECK (true);
CREATE POLICY "Qualquer um pode alterar agendamento" ON public.appointments FOR UPDATE USING (true);
CREATE POLICY "Qualquer um pode deletar agendamento" ON public.appointments FOR DELETE USING (true);

-- 4. Habilita as atualizações em Tempo Real
ALTER PUBLICATION supabase_realtime ADD TABLE public.appointments;

-- 5. Força o Supabase a atualizar o cache interno (MUITO IMPORTANTE!)
NOTIFY pgrst, 'reload schema';
