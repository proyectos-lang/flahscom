-- Tabla de perfiles para almacenar información adicional de usuarios
CREATE TABLE IF NOT EXISTS perfiles (
  id SERIAL PRIMARY KEY,
  auth_user_id UUID UNIQUE NOT NULL,
  nombre VARCHAR(255) NOT NULL,
  rol VARCHAR(50) NOT NULL CHECK (rol IN ('vendedor', 'administrador')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear índice para mejorar las búsquedas por auth_user_id
CREATE INDEX IF NOT EXISTS idx_perfiles_auth_user ON perfiles(auth_user_id);

-- Crear índice para mejorar las búsquedas por rol
CREATE INDEX IF NOT EXISTS idx_perfiles_rol ON perfiles(rol);
