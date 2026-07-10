-- Add missing fields to permisos table if they don't exist

-- Check and add programacion field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'permisos' AND column_name = 'programacion'
  ) THEN
    ALTER TABLE permisos ADD COLUMN programacion BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Check and add vista_tecnico field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'permisos' AND column_name = 'vista_tecnico'
  ) THEN
    ALTER TABLE permisos ADD COLUMN vista_tecnico BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Check and add historial_instalaciones field
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'permisos' AND column_name = 'historial_instalaciones'
  ) THEN
    ALTER TABLE permisos ADD COLUMN historial_instalaciones BOOLEAN DEFAULT false;
  END IF;
END $$;

-- Verify the columns were added
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'permisos'
AND column_name IN ('programacion', 'vista_tecnico', 'historial_instalaciones')
ORDER BY column_name;
