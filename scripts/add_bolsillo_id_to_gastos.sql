-- Agrega la columna bolsillo_id a la tabla gastos
ALTER TABLE public.gastos 
ADD COLUMN IF NOT EXISTS bolsillo_id bigint REFERENCES public.bolsillos(id) ON DELETE SET NULL;

-- Crea un índice para mejorar el rendimiento de las consultas
CREATE INDEX IF NOT EXISTS idx_gastos_bolsillo_id ON public.gastos(bolsillo_id);

-- Opcional: Si quieres que los gastos antiguos tengan un bolsillo por defecto, puedes actualizarlos aquí
-- UPDATE public.gastos SET bolsillo_id = (SELECT id FROM public.bolsillos LIMIT 1) WHERE bolsillo_id IS NULL;
