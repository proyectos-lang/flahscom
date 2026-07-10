-- =========================================================
-- Gestion de Gastos Module
-- Creates: categorias_gastos, gastos, adds permisos.gastos
-- =========================================================

-- 1) categorias_gastos table
CREATE TABLE IF NOT EXISTS public.categorias_gastos (
  id SERIAL PRIMARY KEY,
  nombre VARCHAR(120) NOT NULL UNIQUE,
  descripcion TEXT,
  activo BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2) gastos table
CREATE TABLE IF NOT EXISTS public.gastos (
  id SERIAL PRIMARY KEY,
  categoria_id INTEGER NOT NULL REFERENCES public.categorias_gastos(id) ON DELETE RESTRICT,
  monto NUMERIC(12, 2) NOT NULL CHECK (monto >= 0),
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  descripcion TEXT,
  metodo_pago VARCHAR(40) DEFAULT 'Efectivo',
  url_comprobante TEXT,
  registrado_por TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_gastos_categoria ON public.gastos(categoria_id);
CREATE INDEX IF NOT EXISTS idx_gastos_fecha ON public.gastos(fecha);

-- 3) Add "gastos" permission column to permisos table
ALTER TABLE public.permisos
  ADD COLUMN IF NOT EXISTS gastos BOOLEAN DEFAULT FALSE;

-- 4) Seed default categorias (only if table is empty)
INSERT INTO public.categorias_gastos (nombre, descripcion)
SELECT * FROM (VALUES
  ('Combustible', 'Compra de combustible para vehiculos de la empresa'),
  ('Materiales', 'Materiales de instalacion y repuestos'),
  ('Servicios Publicos', 'Energia, agua, telefono, internet'),
  ('Nomina', 'Pagos de planilla y bonificaciones'),
  ('Mantenimiento', 'Mantenimiento de vehiculos y oficina'),
  ('Viaticos', 'Viaticos y gastos de viaje del personal')
) AS v(nombre, descripcion)
WHERE NOT EXISTS (SELECT 1 FROM public.categorias_gastos);
