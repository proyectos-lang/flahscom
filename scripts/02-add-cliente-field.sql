-- Add cliente column to plan_pagos table to store client full name
ALTER TABLE plan_pagos ADD COLUMN IF NOT EXISTS cliente VARCHAR(255);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_plan_pagos_cliente ON plan_pagos(cliente);
