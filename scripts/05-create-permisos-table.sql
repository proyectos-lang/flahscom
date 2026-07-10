-- Crear tabla de permisos para gestionar acceso de usuarios a módulos
CREATE TABLE IF NOT EXISTS public.permisos (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  auth_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Permisos por módulo (TRUE = acceso permitido, FALSE = acceso denegado)
  dashboard boolean DEFAULT true,
  ventas boolean DEFAULT false,
  auditoria boolean DEFAULT false,
  cartera boolean DEFAULT false,
  cobros boolean DEFAULT false,
  vendedores boolean DEFAULT false,
  paquetes boolean DEFAULT false,
  mapa boolean DEFAULT false,
  historial_pagos boolean DEFAULT false,
  instalaciones boolean DEFAULT false,
  usuarios boolean DEFAULT false,
  
  -- Metadatos
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Asegurar que cada usuario tenga solo un registro de permisos
  CONSTRAINT permisos_auth_user_id_unique UNIQUE (auth_user_id)
);

-- Índice para búsquedas rápidas por auth_user_id
CREATE INDEX IF NOT EXISTS idx_permisos_auth_user_id ON public.permisos(auth_user_id);

-- Función para actualizar updated_at automáticamente
CREATE OR REPLACE FUNCTION update_permisos_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para actualizar updated_at
CREATE TRIGGER trigger_update_permisos_updated_at
  BEFORE UPDATE ON public.permisos
  FOR EACH ROW
  EXECUTE FUNCTION update_permisos_updated_at();

-- Comentarios descriptivos
COMMENT ON TABLE public.permisos IS 'Tabla de permisos de acceso a módulos por usuario';
COMMENT ON COLUMN public.permisos.auth_user_id IS 'ID del usuario en authentication de Supabase';
COMMENT ON COLUMN public.permisos.dashboard IS 'Acceso al módulo Dashboard';
COMMENT ON COLUMN public.permisos.ventas IS 'Acceso al módulo de Ventas';
COMMENT ON COLUMN public.permisos.auditoria IS 'Acceso al módulo de Auditoría';
COMMENT ON COLUMN public.permisos.cartera IS 'Acceso al módulo de Cartera';
COMMENT ON COLUMN public.permisos.cobros IS 'Acceso al módulo de Cobros';
COMMENT ON COLUMN public.permisos.vendedores IS 'Acceso al módulo de Vendedores';
COMMENT ON COLUMN public.permisos.paquetes IS 'Acceso al módulo de Paquetes';
COMMENT ON COLUMN public.permisos.mapa IS 'Acceso al módulo de Mapa';
COMMENT ON COLUMN public.permisos.historial_pagos IS 'Acceso al módulo de Historial de Pagos';
COMMENT ON COLUMN public.permisos.instalaciones IS 'Acceso al módulo de Instalaciones';
COMMENT ON COLUMN public.permisos.usuarios IS 'Acceso al módulo de Usuarios';
