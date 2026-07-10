-- Create cuadrillas table
CREATE TABLE IF NOT EXISTS cuadrillas (
  id SERIAL PRIMARY KEY,
  nombre TEXT NOT NULL,
  lider TEXT NOT NULL,
  telefono TEXT,
  placa_vehiculo TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cuadrilla_miembros table
CREATE TABLE IF NOT EXISTS cuadrilla_miembros (
  id SERIAL PRIMARY KEY,
  cuadrilla_id INTEGER NOT NULL REFERENCES cuadrillas(id) ON DELETE CASCADE,
  nombre TEXT NOT NULL,
  rol TEXT NOT NULL DEFAULT 'Instalador',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert default cuadrillas
INSERT INTO cuadrillas (nombre, lider, telefono, placa_vehiculo, activo)
VALUES
  ('Cuadrilla 1', 'Por asignar', '', '', true),
  ('Cuadrilla 2', 'Por asignar', '', '', true),
  ('Cuadrilla 3', 'Por asignar', '', '', true),
  ('Cuadrilla 4', 'Por asignar', '', '', true),
  ('Cuadrilla 5', 'Por asignar', '', '', true)
ON CONFLICT DO NOTHING;
