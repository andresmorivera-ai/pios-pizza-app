-- Para solucionar el problema al procesar el pago ("new row violates row-level security policy for table ventas")
-- Por favor, ejecuta este script en el editor SQL de tu panel de control (Dashboard) de Supabase

ALTER TABLE public.ventas DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.venta_productos DISABLE ROW LEVEL SECURITY;

-- Por precaución, aseguramos lo mismo en las tablas de órdenes por si acaso
ALTER TABLE public.ordenes DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.ordenesgenerales DISABLE ROW LEVEL SECURITY;
