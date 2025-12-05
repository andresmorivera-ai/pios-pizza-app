-- Add new columns to ordenesgenerales table for tracking product status
ALTER TABLE ordenesgenerales 
ADD COLUMN IF NOT EXISTS productos_nuevos integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS productos_listos integer[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS productos_entregados integer[] DEFAULT '{}';

-- Comment on columns
COMMENT ON COLUMN ordenesgenerales.productos_nuevos IS 'Indices of products that are new';
COMMENT ON COLUMN ordenesgenerales.productos_listos IS 'Indices of products that are ready';
COMMENT ON COLUMN ordenesgenerales.productos_entregados IS 'Indices of products that have been delivered';
