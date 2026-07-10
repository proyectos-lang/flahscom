-- Migration to add fecha_pago and update confirmado field type in plan_pagos table

-- Add fecha_pago column if it doesn't exist
ALTER TABLE plan_pagos 
ADD COLUMN IF NOT EXISTS fecha_pago DATE;

-- Update confirmado to accept text values if it's still boolean
DO $$ 
BEGIN
  -- Check if confirmado is boolean type
  IF (SELECT data_type FROM information_schema.columns 
      WHERE table_name = 'plan_pagos' AND column_name = 'confirmado') = 'boolean' 
  THEN
    -- Drop the old boolean column and recreate as text
    ALTER TABLE plan_pagos DROP COLUMN confirmado;
    ALTER TABLE plan_pagos ADD COLUMN confirmado VARCHAR(10) DEFAULT 'no';
  END IF;
END $$;

-- Add comprobante column if it doesn't exist
ALTER TABLE plan_pagos 
ADD COLUMN IF NOT EXISTS comprobante TEXT;
