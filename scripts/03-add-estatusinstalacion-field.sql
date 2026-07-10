-- Add estatusinstalacion field to contratos table
ALTER TABLE contratos 
ADD COLUMN IF NOT EXISTS estatusinstalacion VARCHAR(50) DEFAULT 'pendiente' 
CHECK (estatusinstalacion IN ('pendiente', 'instalado'));

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_contratos_estatusinstalacion ON contratos(estatusinstalacion);
