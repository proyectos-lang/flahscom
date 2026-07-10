-- Add new photo columns to instalaciones table
-- These columns store the 12 required photos for installation evidence

ALTER TABLE instalaciones
ADD COLUMN IF NOT EXISTS url_foto_potencia_caset TEXT,
ADD COLUMN IF NOT EXISTS url_foto_pi_fibra TEXT,
ADD COLUMN IF NOT EXISTS url_foto_pf_fibra TEXT,
ADD COLUMN IF NOT EXISTS url_foto_numeracion_nap TEXT,
ADD COLUMN IF NOT EXISTS url_foto_etiqueta_cliente_nap TEXT,
ADD COLUMN IF NOT EXISTS url_foto_potencia_liuk TEXT,
ADD COLUMN IF NOT EXISTS url_foto_serie_equipo TEXT,
ADD COLUMN IF NOT EXISTS url_foto_potencia_interna TEXT,
ADD COLUMN IF NOT EXISTS url_foto_contrasena TEXT,
ADD COLUMN IF NOT EXISTS url_foto_test_velocidad TEXT,
ADD COLUMN IF NOT EXISTS url_foto_estetico_equipos TEXT,
ADD COLUMN IF NOT EXISTS url_foto_tv_pantalla TEXT;

-- Drop old columns if they exist (optional cleanup)
-- ALTER TABLE instalaciones DROP COLUMN IF EXISTS url_evidencia_test_velocidad;
-- ALTER TABLE instalaciones DROP COLUMN IF EXISTS url_evidencia_instalación_fisica;
