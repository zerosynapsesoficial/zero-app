-- ==============================================================================
-- ZERO APP - PREVENIR AGENDAMENTOS DUPLICADOS (CONFLITO DE HORÁRIO)
-- Execute este script no SQL Editor do Supabase para garantir a integridade
-- ==============================================================================

-- 1. Cria um índice único parcial para garantir que cada Profissional 
-- tenha sua própria agenda única e que NENHUM agendamento conflite
-- no mesmo dia e horário, a menos que o status seja 'cancelled' (cancelado).
CREATE UNIQUE INDEX IF NOT EXISTS appointments_no_overlap_idx 
ON public.appointments (professional_id, date, time) 
WHERE (status != 'cancelled');

-- 2. Recarregar o cache do PostgREST para refletir quaisquer mudanças de esquema
NOTIFY pgrst, 'reload schema';
