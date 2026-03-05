-- Para solucionar el problema al agregar gastos ("new row violates row-level security policy for table gastos")
-- Por favor, ejecuta este script en el editor SQL de tu panel de control (Dashboard) de Supabase

ALTER TABLE public.gastos DISABLE ROW LEVEL SECURITY;
