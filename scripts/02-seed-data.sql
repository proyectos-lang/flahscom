-- Insert admin user (password: admin123)
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES
('admin@sidhonduras.com', '$2a$10$rKvVyV5YhVxZqKxPZVZx7.vGYZQqNZQZQZQZQZQZQZQZQZQZQZQZQ', 'Administrador Sistema', 'admin', '+504 9999-9999');

-- Insert sample vendors
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES
('vendor1@sidhonduras.com', '$2a$10$rKvVyV5YhVxZqKxPZVZx7.vGYZQqNZQZQZQZQZQZQZQZQZQZQZQZQ', 'Carlos Mendoza', 'vendor', '+504 9876-5432'),
('vendor2@sidhonduras.com', '$2a$10$rKvVyV5YhVxZqKxPZVZx7.vGYZQqNZQZQZQZQZQZQZQZQZQZQZQZQ', 'Maria Rodriguez', 'vendor', '+504 9876-5433');

-- Insert sample auditor
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES
('auditor@sidhonduras.com', '$2a$10$rKvVyV5YhVxZqKxPZVZx7.vGYZQqNZQZQZQZQZQZQZQZQZQZQZQZQ', 'Juan Perez', 'auditor', '+504 9876-5434');

-- Insert sample office user
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES
('office@sidhonduras.com', '$2a$10$rKvVyV5YhVxZqKxPZVZx7.vGYZQqNZQZQZQZQZQZQZQZQZQZQZQZQ', 'Ana Lopez', 'office', '+504 9876-5435');

-- Insert sample internal plant user
INSERT INTO users (email, password_hash, full_name, role, phone) VALUES
('plant@sidhonduras.com', '$2a$10$rKvVyV5YhVxZqKxPZVZx7.vGYZQqNZQZQZQZQZQZQZQZQZQZQZQZQ', 'Roberto Garcia', 'internal_plant', '+504 9876-5436');

-- Insert sample packages
INSERT INTO paquetes (nombre, precio_mensual, velocidad, descripcion, activo) VALUES
('Básico 10 Mbps', 350.00, '10 Mbps', 'Plan básico ideal para navegación web y redes sociales', true),
('Estándar 20 Mbps', 500.00, '20 Mbps', 'Plan estándar para streaming y trabajo remoto', true),
('Premium 50 Mbps', 750.00, '50 Mbps', 'Plan premium para múltiples dispositivos y streaming HD', true),
('Empresarial 100 Mbps', 1200.00, '100 Mbps', 'Plan empresarial para negocios y streaming 4K', true);

-- Added seed data for vendedores table
INSERT INTO vendedores (nombre, telefono, email, activo) VALUES
('Carlos Mendoza', '+504 9876-5432', 'carlos.mendoza@sidhonduras.com', true),
('Maria Rodriguez', '+504 9876-5433', 'maria.rodriguez@sidhonduras.com', true),
('Luis Fernando', '+504 9876-5434', 'luis.fernando@sidhonduras.com', true),
('Sofia Martinez', '+504 9876-5435', 'sofia.martinez@sidhonduras.com', true),
('Jorge Ramirez', '+504 9876-5436', 'jorge.ramirez@sidhonduras.com', true);
