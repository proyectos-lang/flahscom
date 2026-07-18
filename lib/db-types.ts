export type UserRole = "vendor" | "auditor" | "office" | "internal_plant" | "admin"

export type InstallationStatus = "pending" | "approved" | "rejected" | "active"

export type PaymentStatusType = "green" | "yellow" | "red"

export type DocumentType = "identity_front" | "identity_back" | "contract" | "installation_photo" | "house_photo"

export type PaymentMethod = "cash" | "bank_transfer" | "card" | "mobile_payment"

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  phone: string | null
  created_at: string
  updated_at: string
}

export interface Client {
  id: string
  full_name: string
  identity_number: string
  phone: string
  email: string | null
  address: string
  latitud: number | null
  longitud: number | null
  vendor_id: string | null
  created_at: string
  updated_at: string
}

export interface Package {
  id: string
  nombre: string
  velocidad: string
  precio_mensual: number
  descripcion: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Installation {
  id: string
  client_id: string
  vendor_id: string | null
  vendedor_id: string | null // Added vendedor_id field
  paquete_id: string | null
  installation_date: string
  plan_type: string
  monthly_fee: number
  installation_cost: number
  equipment_details: string | null
  status: InstallationStatus
  notes: string | null
  created_at: string
  updated_at: string
}

export interface Document {
  id: string
  installation_id: string
  document_type: DocumentType
  file_url: string
  file_name: string
  uploaded_by: string | null
  uploaded_at: string
}

export interface Payment {
  id: string
  client_id: string
  installation_id: string | null
  amount: number
  payment_date: string
  payment_method: PaymentMethod
  collected_by: string | null
  receipt_number: string | null
  notes: string | null
  created_at: string
}

export interface PaymentStatus {
  id: string
  client_id: string
  last_payment_date: string | null
  days_overdue: number
  status: PaymentStatusType
  updated_at: string
}

export interface AuditLog {
  id: string
  installation_id: string
  auditor_id: string | null
  audit_date: string
  status: "approved" | "rejected" | "pending_review"
  comments: string | null
  created_at: string
}

export interface Vendor {
  id: string
  nombre: string
  telefono: string | null
  email: string | null
  activo: boolean
  created_at: string
  updated_at: string
}

export interface Contrato {
  id: number
  cliente_id: string
  vendedor_id: string
  paquete_id: string | null
  nombre_paquete: string
  valor_paquete: number
  numero_contador: string | null
  estado_auditoria: "pendiente" | "aprobado" | "rechazado"
  estatusinstalacion?: "pendiente" | "instalado" // Added installation status field
  fecha_contratacion: string
  url_identidad_frontal: string | null
  url_identidad_reverso: string | null
  url_contrato_1: string | null
  url_contrato_2: string | null
  url_fachada: string | null
  url_recibo_pago_inicial: string | null
  created_at: string
  updated_at: string
}

export interface PlanPagos {
  id: string
  contrato_id: number
  numero_cuota: number
  fecha_vencimiento: string
  monto_esperado: number
  pagado: boolean
  confirmado: string | boolean // Updated to support "si" string or boolean
  comprobante: string | null
  fecha_pago: string | null
  referencia: string | null
  // Voucher/receipt date entered by the user (separate from fecha_pago).
  pagoreferencia: string | null
  // Name of the user who registered the payment.
  usuariopago: string | null
  // Name of the user who approved (confirmed) the payment.
  usuarioconfirma: string | null
  created_at: string
  updated_at: string
}

export interface Perfil {
  id: number
  auth_user_id: string
  nombre: string
  rol: "vendedor" | "administrador"
  created_at: string
  updated_at: string
}

export interface Permiso {
  id: number
  auth_user_id: string
  dashboard: boolean
  dashboard_diario: boolean
  ventas: boolean
  auditoria: boolean
  cartera: boolean
  cobros: boolean
  vendedores: boolean
  paquetes: boolean
  mapa: boolean
  historial_pagos: boolean
  instalaciones: boolean
  historial_instalaciones: boolean
  call_center: boolean
  usuarios: boolean
  permisos: boolean
  programacion: boolean
  vista_tecnico: boolean
  rrhh: boolean
  gastos: boolean
  inventario: boolean
  created_at: string
  updated_at: string
}

export interface InstalacionProgramada {
  id: number
  contrato_id: number
  cuadrilla: string
  fecha_programada: string
  bloque_horario: string
  estatus: "programado" | "en_proceso" | "instalado"
  hora_inicio: string | null
  hora_fin: string | null
  serie_ont: string | null
  serie_antena: string | null
  foto_senal: string | null
  foto_rack: string | null
  firma_cliente: string | null
  created_at: string
  updated_at: string
}
