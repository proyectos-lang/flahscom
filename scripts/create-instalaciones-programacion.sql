-- Create instalaciones table for tracking scheduled installations
CREATE TABLE IF NOT EXISTS instalaciones (
  id SERIAL PRIMARY KEY,
  contrato_id INTEGER REFERENCES contratos(id),
  cuadrilla TEXT NOT NULL,
  fecha_programada DATE NOT NULL,
  bloque_horario TEXT NOT NULL,
  estatus TEXT DEFAULT 'programado',
  hora_inicio TIMESTAMPTZ,
  hora_fin TIMESTAMPTZ,
  serie_ont TEXT,
  serie_antena TEXT,
  foto_senal TEXT,
  foto_rack TEXT,
  firma_cliente TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add permissions columns for the new modules
ALTER TABLE permisos ADD COLUMN IF NOT EXISTS programacion BOOLEAN DEFAULT false;
ALTER TABLE permisos ADD COLUMN IF NOT EXISTS vista_tecnico BOOLEAN DEFAULT false;
