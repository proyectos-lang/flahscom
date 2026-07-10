-- Create nominas table (master records for payroll periods)
CREATE TABLE IF NOT EXISTS public.nominas (
  id SERIAL PRIMARY KEY,
  periodo VARCHAR(100) NOT NULL,
  descripcion TEXT,
  estado VARCHAR(20) DEFAULT 'borrador' CHECK (estado IN ('borrador', 'aprobada', 'pagada')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create periodos_nomina table (detail records for each employee in a payroll)
CREATE TABLE IF NOT EXISTS public.periodos_nomina (
  id SERIAL PRIMARY KEY,
  nomina_id INTEGER NOT NULL REFERENCES public.nominas(id) ON DELETE CASCADE,
  empleado_id INTEGER NOT NULL REFERENCES public.empleados(id) ON DELETE CASCADE,
  fecha_inicio DATE NOT NULL,
  fecha_fin DATE NOT NULL,
  dias_laborados INTEGER DEFAULT 0,
  salario_devengado DECIMAL(10,2) DEFAULT 0,
  viaticos DECIMAL(10,2) DEFAULT 0,
  total_deducciones DECIMAL(10,2) DEFAULT 0,
  neto_pagado DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_periodos_nomina_nomina_id ON public.periodos_nomina(nomina_id);
CREATE INDEX IF NOT EXISTS idx_periodos_nomina_empleado_id ON public.periodos_nomina(empleado_id);
CREATE INDEX IF NOT EXISTS idx_nominas_created_at ON public.nominas(created_at DESC);
