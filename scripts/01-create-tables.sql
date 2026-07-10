-- Users table with roles
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name VARCHAR(255) NOT NULL,
  role VARCHAR(50) NOT NULL CHECK (role IN ('vendor', 'auditor', 'office', 'internal_plant', 'admin')),
  phone VARCHAR(20),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Clients table
CREATE TABLE IF NOT EXISTS clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name VARCHAR(255) NOT NULL,
  identity_number VARCHAR(50) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255),
  address TEXT NOT NULL,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  vendor_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Installations table
CREATE TABLE IF NOT EXISTS installations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  vendor_id UUID REFERENCES users(id),
  installation_date DATE NOT NULL,
  plan_type VARCHAR(100) NOT NULL,
  monthly_fee DECIMAL(10, 2) NOT NULL,
  installation_cost DECIMAL(10, 2) NOT NULL,
  equipment_details TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'active')),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Documents table (for photos and contracts)
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID REFERENCES installations(id) ON DELETE CASCADE,
  document_type VARCHAR(50) NOT NULL CHECK (document_type IN ('identity_front', 'identity_back', 'contract', 'installation_photo', 'house_photo')),
  file_url TEXT NOT NULL,
  file_name VARCHAR(255) NOT NULL,
  uploaded_by UUID REFERENCES users(id),
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payments table
CREATE TABLE IF NOT EXISTS payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  installation_id UUID REFERENCES installations(id),
  amount DECIMAL(10, 2) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('cash', 'bank_transfer', 'card', 'mobile_payment')),
  collected_by UUID REFERENCES users(id),
  receipt_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Payment status view (traffic light system)
CREATE TABLE IF NOT EXISTS payment_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  last_payment_date DATE,
  days_overdue INTEGER DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'green' CHECK (status IN ('green', 'yellow', 'red')),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  installation_id UUID REFERENCES installations(id) ON DELETE CASCADE,
  auditor_id UUID REFERENCES users(id),
  audit_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  status VARCHAR(50) NOT NULL CHECK (status IN ('approved', 'rejected', 'pending_review')),
  comments TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Packages table for plan types
CREATE TABLE IF NOT EXISTS paquetes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  precio_mensual DECIMAL(10, 2) NOT NULL,
  velocidad VARCHAR(50),
  descripcion TEXT,
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Added vendedores table to store vendor information
CREATE TABLE IF NOT EXISTS vendedores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nombre VARCHAR(255) NOT NULL,
  telefono VARCHAR(20),
  email VARCHAR(255),
  activo BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Added contratos table to store contracts with document URLs
CREATE TABLE IF NOT EXISTS contratos (
  id SERIAL PRIMARY KEY,
  cliente_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  vendedor_id UUID REFERENCES vendedores(id),
  paquete_id UUID REFERENCES paquetes(id), -- Added paquete_id to link to packages table
  nombre_paquete VARCHAR(255) NOT NULL,
  valor_paquete NUMERIC(10, 2) NOT NULL,
  numero_contador VARCHAR(100),
  estado_auditoria VARCHAR(50) NOT NULL DEFAULT 'pendiente' CHECK (estado_auditoria IN ('pendiente', 'aprobado', 'rechazado')),
  fecha_contratacion TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  url_identidad_frontal TEXT,
  url_identidad_reverso TEXT,
  url_contrato_1 TEXT,
  url_contrato_2 TEXT,
  url_fachada TEXT,
  url_recibo_pago_inicial TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Added plan_pagos table to store payment plan for each contract
CREATE TABLE IF NOT EXISTS plan_pagos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contrato_id INTEGER REFERENCES contratos(id) ON DELETE CASCADE,
  numero_cuota INTEGER NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  monto_esperado NUMERIC(10, 2) NOT NULL,
  pagado BOOLEAN DEFAULT FALSE,
  confirmado BOOLEAN DEFAULT FALSE,
  comprobante TEXT,
  fecha_pago DATE, -- Added fecha_pago field to track actual payment date
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_clients_vendor ON clients(vendor_id);
CREATE INDEX IF NOT EXISTS idx_installations_client ON installations(client_id);
CREATE INDEX IF NOT EXISTS idx_installations_vendor ON installations(vendor_id);
CREATE INDEX IF NOT EXISTS idx_installations_status ON installations(status);
CREATE INDEX IF NOT EXISTS idx_payments_client ON payments(client_id);
CREATE INDEX IF NOT EXISTS idx_payments_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payment_status_client ON payment_status(client_id);
CREATE INDEX IF NOT EXISTS idx_payment_status_status ON payment_status(status);
CREATE INDEX IF NOT EXISTS idx_documents_installation ON documents(installation_id);
CREATE INDEX IF NOT EXISTS idx_contratos_cliente ON contratos(cliente_id);
CREATE INDEX IF NOT EXISTS idx_contratos_vendedor ON contratos(vendedor_id);
CREATE INDEX IF NOT EXISTS idx_contratos_estado_auditoria ON contratos(estado_auditoria);
-- Added index for plan_pagos
CREATE INDEX IF NOT EXISTS idx_plan_pagos_contrato ON plan_pagos(contrato_id);
CREATE INDEX IF NOT EXISTS idx_plan_pagos_fecha ON plan_pagos(fecha_vencimiento);
