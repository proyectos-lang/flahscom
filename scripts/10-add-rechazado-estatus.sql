-- Drop and recreate check constraint on fallas to include 'rechazado'
ALTER TABLE fallas DROP CONSTRAINT IF EXISTS fallas_estatus_falla_check;
ALTER TABLE fallas ADD CONSTRAINT fallas_estatus_falla_check
  CHECK (estatus_falla IN ('reportada', 'programada', 'en_proceso', 'resuelta', 'fallida', 'rechazado'));

-- Drop and recreate check constraint on instalaciones to include 'rechazado'
ALTER TABLE instalaciones DROP CONSTRAINT IF EXISTS instalaciones_estatus_instalacion_check;
ALTER TABLE instalaciones ADD CONSTRAINT instalaciones_estatus_instalacion_check
  CHECK (estatus_instalacion IN ('programada', 'en_ruta', 'en_proceso', 'instalado', 'fallido', 'rechazado'));
