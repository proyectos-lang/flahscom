-- Agregar columna de permisos para el módulo de Gestión de Permisos
ALTER TABLE public.permisos 
ADD COLUMN IF NOT EXISTS permisos boolean DEFAULT false;

-- Agregar comentario descriptivo
COMMENT ON COLUMN public.permisos.permisos IS 'Acceso al módulo de Gestión de Permisos';
