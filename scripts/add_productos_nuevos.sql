-- Run this script in your Supabase SQL Editor to add the missing column

ALTER TABLE public.ordenes
ADD COLUMN IF NOT EXISTS productos_nuevos integer[] DEFAULT '{}';

-- Optional: Ensure other status arrays exist as well
ALTER TABLE public.ordenes
ADD COLUMN IF NOT EXISTS productos_listos integer[] DEFAULT '{}';

ALTER TABLE public.ordenes
ADD COLUMN IF NOT EXISTS productos_entregados integer[] DEFAULT '{}';
