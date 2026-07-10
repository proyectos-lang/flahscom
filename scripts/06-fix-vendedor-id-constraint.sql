-- Drop the incorrect foreign key constraint that points to perfiles
ALTER TABLE contratos 
DROP CONSTRAINT IF EXISTS contratos_vendedor_id_fkey;

-- Re-add the correct foreign key constraint that points to vendedores
ALTER TABLE contratos 
ADD CONSTRAINT contratos_vendedor_id_fkey 
FOREIGN KEY (vendedor_id) REFERENCES vendedores(id);
