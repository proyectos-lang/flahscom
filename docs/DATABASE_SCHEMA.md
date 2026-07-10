# Database schema

Generated directly from the live Supabase project via the PostgREST OpenAPI spec (`https://oygvmlplpwrjhjsjuxot.supabase.co/rest/v1/`), cross-checked against `information_schema`/`pg_policies` output from `scripts/99-schema-introspection.sql`.

## ⚠️ Row Level Security — critical finding

Out of 30 tables, **only 2 have RLS policies defined**:

| Table | Policy | Command | Roles |
|---|---|---|---|
| `evaluaciones` | Permitir inserciones públicas en evaluaciones | INSERT | public |
| `empleados` | Permitir lectura pública de nombres de empleados | SELECT | public |

All other tables have no policy at all. A live check using **only the public `anon` key** (the one shipped in every browser bundle via `NEXT_PUBLIC_SUPABASE_ANON_KEY`) confirms these are readable with zero authentication:

| Table | Rows exposed via anon key |
|---|---|
| `perfiles` | 18 |
| `permisos` | 18 |
| `clientes` | 5,274 |
| `contratos` | 5,289 |
| `empleados` | 117 |
| `plan_pagos` | 63,544 |

This means anyone who opens the deployed site can call `GET {SUPABASE_URL}/rest/v1/clientes?select=*` (or any other table) directly against Supabase — completely bypassing the Next.js app, its login screen, and the `permisos` checks — and read the full customer list, contracts, payment history, and user profiles/roles. If RLS is disabled (not just unpoliced) rather than enabled, standard Supabase default grants may also allow **INSERT/UPDATE/DELETE** from the anon role, which was not tested here to avoid touching production data, but should be assumed possible until confirmed otherwise.

**Recommended fix** (matches how the app is already built — nearly every read/write goes through `/api/*` routes using `SUPABASE_SERVICE_ROLE_KEY`, which bypasses RLS regardless):
1. Enable RLS on every `public` table: `ALTER TABLE public.<table> ENABLE ROW LEVEL SECURITY;`
2. Add no policies for `anon`/`authenticated` on most tables — the API routes use the service key and are unaffected by RLS.
3. Add narrow policies only where the browser talks to Supabase directly today (`lib/auth-context.tsx` reads `perfiles` and `permisos` with the anon/browser client), e.g. `USING (auth_user_id = auth.uid())` so a logged-in user can only read their own profile/permissions row.
4. Re-run the anon-key checks above after the change — they should return `401`/empty instead of row counts.

This is a production data-exposure issue independent of the GitHub/Vercel migration — it already applies today, wherever the app is hosted. It has not been fixed yet; ask before making DB-level changes since RLS misconfiguration can also break legitimate app functionality if policies are missing.

## Tables (30)

- [adelantos_nomina](#adelantos-nomina)
- [asistencias](#asistencias)
- [catalogo_productos](#catalogo-productos)
- [categorias_gastos](#categorias-gastos)
- [clientes](#clientes)
- [contratos](#contratos)
- [cuadrilla_miembros](#cuadrilla-miembros)
- [cuadrillas](#cuadrillas)
- [deducciones](#deducciones)
- [dotaciones](#dotaciones)
- [empleados](#empleados)
- [evaluaciones](#evaluaciones)
- [fallas](#fallas)
- [gastos](#gastos)
- [instalaciones](#instalaciones)
- [inventario_miscelaneo](#inventario-miscelaneo)
- [inventario_serializado](#inventario-serializado)
- [nominas](#nominas)
- [pagos_recibidos](#pagos-recibidos)
- [paquetes](#paquetes)
- [perfiles](#perfiles)
- [periodos_nomina](#periodos-nomina)
- [permisos](#permisos)
- [plan_pagos](#plan-pagos)
- [prestaciones_acuerdos](#prestaciones-acuerdos)
- [prestaciones_pagos](#prestaciones-pagos)
- [procesos_disciplinarios](#procesos-disciplinarios)
- [transacciones_inventario](#transacciones-inventario)
- [vacaciones](#vacaciones)
- [vendedores](#vendedores)

## Views (3)

- [v_cuota_vigente_detallada](#v-cuota-vigente-detallada)
- [vw_control_vacaciones](#vw-control-vacaciones)
- [vw_liquidacion_nomina](#vw-liquidacion-nomina)

---

## adelantos_nomina

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  | FK → empleados.id |
| monto | number | numeric | NOT NULL |  |  |
| justificacion | string | text | nullable |  |  |
| estado | string | text | nullable | pendiente |  |
| url_firma_solicitante | string | text | nullable |  |  |
| url_firma_aprobador | string | text | nullable |  |  |
| fecha_solicitud | string | date | nullable | CURRENT_DATE |  |
| fecha_aprobacion | string | date | nullable |  |  |
| periodo_descuento | string | date | nullable |  |  |

**Foreign keys:**

- `empleado_id` → `empleados.id`

---

## asistencias

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  | FK → empleados.id |
| fecha | string | date | NOT NULL | CURRENT_DATE |  |
| tipo | string | text | nullable | asistencia |  |
| hora_entrada | string | time without time zone | nullable |  |  |
| hora_salida | string | time without time zone | nullable |  |  |
| observaciones | string | text | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |

**Foreign keys:**

- `empleado_id` → `empleados.id`

---

## catalogo_productos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| nombre | string | text | NOT NULL |  |  |
| tipo | string | text | nullable |  |  |
| unidad_medida | string | text | nullable | Unidad |  |

---

## categorias_gastos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| nombre | string | text | NOT NULL |  |  |
| descripcion | string | text | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |

---

## clientes

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| nombre_completo | string | text | NOT NULL |  |  |
| numero_identidad | string | text | NOT NULL |  |  |
| telefono | string | text | nullable |  |  |
| direccion | string | text | nullable |  |  |
| latitud | number | numeric | nullable |  |  |
| longitud | number | numeric | nullable |  |  |
| ubicacion_geom | string | public.geography(Point,4326) | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| email | string | text | nullable |  |  |
| colonia | string | text | nullable |  |  |

---

## contratos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | bigint | NOT NULL |  | PK |
| cliente_id | integer | integer | nullable |  | FK → clientes.id |
| vendedor_id | integer | integer | nullable |  |  |
| paquete_id | integer | integer | nullable |  | FK → paquetes.id |
| nombre_paquete | string | text | nullable |  |  |
| valor_paquete | number | numeric | nullable |  |  |
| numero_contador | string | text | nullable |  |  |
| estado_auditoria | string | public.estado_auditoria | nullable | pendiente | enum: pendiente, aprobada, rechazada, finalizada |
| observaciones_rechazo | string | text | nullable |  |  |
| fecha_contratacion | string | timestamp with time zone | nullable | now() |  |
| url_identidad_frontal | string | text | nullable |  |  |
| url_identidad_reverso | string | text | nullable |  |  |
| url_contrato_1 | string | text | nullable |  |  |
| url_contrato_2 | string | text | nullable |  |  |
| url_fachada | string | text | nullable |  |  |
| url_recibo_pago_inicial | string | text | nullable |  |  |
| estatusinstalacion | string | text | nullable |  |  |
| notas | string | text | nullable |  |  |
| fechanormal | string | date | nullable |  |  |
| colonia | string | text | nullable |  |  |
| id_objetivo | integer | bigint | nullable |  |  |

**Foreign keys:**

- `cliente_id` → `clientes.id`
- `paquete_id` → `paquetes.id`

---

## cuadrilla_miembros

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| cuadrilla_id | integer | integer | nullable |  | FK → cuadrillas.id |
| nombre_tecnico | string | text | NOT NULL |  |  |
| rol_tecnico | string | text | nullable |  |  |

**Foreign keys:**

- `cuadrilla_id` → `cuadrillas.id`

---

## cuadrillas

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| nombre_cuadrilla | string | text | NOT NULL |  |  |
| lider_nombre | string | text | NOT NULL |  |  |
| telefono_lider | string | text | nullable |  |  |
| vehiculo_placa | string | text | nullable |  |  |
| activa | boolean | boolean | nullable | true |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| contrasena | string | text | nullable |  |  |

---

## deducciones

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  | FK → empleados.id |
| concepto | string | text | NOT NULL |  |  |
| monto | number | numeric | NOT NULL |  |  |
| fecha_aplicacion | string | date | NOT NULL |  |  |

**Foreign keys:**

- `empleado_id` → `empleados.id`

---

## dotaciones

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  | FK → empleados.id |
| articulo_entregado | string | text | NOT NULL |  |  |
| fecha_entrega | string | date | NOT NULL |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |

**Foreign keys:**

- `empleado_id` → `empleados.id`

---

## empleados

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| identificacion | string | text | NOT NULL |  |  |
| nombre_completo | string | text | NOT NULL |  |  |
| direccion | string | text | nullable |  |  |
| empresa | string | text | nullable |  |  |
| correo_personal | string | text | nullable |  |  |
| fecha_ingreso | string | date | nullable |  |  |
| tipo_pago | string | text | nullable |  |  |
| salario_base | number | numeric | nullable |  |  |
| viaticos_transporte | number | numeric | nullable |  |  |
| valor_dia | number | numeric | nullable |  |  |
| activo | boolean | boolean | nullable | true |  |
| url_cv | string | text | nullable |  |  |
| url_antecedentes_policiales | string | text | nullable |  |  |
| url_antecedentes_penales | string | text | nullable |  |  |
| url_dni | string | text | nullable |  |  |
| url_licencia | string | text | nullable |  |  |
| url_solicitud_empleo | string | text | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| funcion | string | text | nullable |  |  |
| dias_vacaciones_restantes | integer | integer | nullable | 15 |  |
| puesto | string | text | nullable |  |  |
| seguro | number | numeric | nullable | 0 |  |

---

## evaluaciones

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  | FK → empleados.id |
| fecha_evaluacion | string | date | NOT NULL | CURRENT_DATE |  |
| evaluador | string | text | nullable |  |  |
| comentarios | string | text | nullable |  |  |
| estado | string | text | nullable | pendiente |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| periodo | string | text | nullable |  |  |
| puntaje_total | number | numeric | nullable |  |  |
| calificacion | string | text | nullable |  |  |
| productividad | integer | integer | nullable |  |  |
| puntualidad | integer | integer | nullable |  |  |
| trabajo_equipo | integer | integer | nullable |  |  |
| comunicacion | integer | integer | nullable |  |  |
| iniciativa | integer | integer | nullable |  |  |

**Foreign keys:**

- `empleado_id` → `empleados.id`

---

## fallas

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| contrato_id | integer | bigint | nullable |  | FK → contratos.id |
| cuadrilla_id | integer | integer | nullable |  | FK → cuadrillas.id |
| reportado_por | string | text | nullable |  |  |
| telefono_contacto_adicional | string | text | nullable |  |  |
| tipo_falla | string | text | nullable |  |  |
| descripcion_falla | string | text | nullable |  |  |
| estatus_falla | string | text | nullable | reportada |  |
| fecha_programada | string | date | nullable |  |  |
| bloque_horario | string | text | nullable |  |  |
| fecha_preferencia_cliente | string | date | nullable |  |  |
| fecha_real_resolucion | string | date | nullable |  |  |
| hora_inicio | string | time without time zone | nullable |  |  |
| hora_fin | string | time without time zone | nullable |  |  |
| observaciones_tecnico | string | text | nullable |  |  |
| urls_evidencias | array | text[] | nullable |  |  |
| url_firma_cliente | string | text | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |

**Foreign keys:**

- `contrato_id` → `contratos.id`
- `cuadrilla_id` → `cuadrillas.id`

---

## gastos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| categoria_id | integer | integer | nullable |  | FK → categorias_gastos.id |
| descripcion | string | text | NOT NULL |  |  |
| monto | number | numeric | NOT NULL | 0 |  |
| fecha | string | date | NOT NULL | CURRENT_DATE |  |
| metodo_pago | string | text | nullable |  |  |
| referencia_pago | string | text | nullable |  |  |
| url_comprobante | string | text | nullable |  |  |
| usuario_registra | string | uuid | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |

**Foreign keys:**

- `categoria_id` → `categorias_gastos.id`

---

## instalaciones

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| contrato_id | integer | bigint | nullable |  | FK → contratos.id |
| cuadrilla_id | integer | integer | nullable |  | FK → cuadrillas.id |
| estatus_instalacion | string | text | nullable | programada |  |
| fecha_programada | string | date | NOT NULL |  |  |
| bloque_horario | string | text | nullable |  |  |
| fecha_real_instalacion | string | date | nullable |  |  |
| hora_inicio | string | time without time zone | nullable |  |  |
| hora_fin | string | time without time zone | nullable |  |  |
| serie_ont_router | string | text | nullable |  |  |
| serie_antena_receptor | string | text | nullable |  |  |
| url_evidencia_instalación_fisica | string | text | nullable |  |  |
| url_firma_cliente | string | text | nullable |  |  |
| observaciones_tecnicas | string | text | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| tipo | string | text | nullable |  |  |
| observacionesnovedad | string | text | nullable |  |  |
| url_foto_potencia_caset | string | text | nullable |  |  |
| url_foto_pi_fibra | string | text | nullable |  |  |
| url_foto_pf_fibra | string | text | nullable |  |  |
| url_foto_numeracion_nap | string | text | nullable |  |  |
| url_foto_etiqueta_cliente_nap | string | text | nullable |  |  |
| url_foto_potencia_liuk | string | text | nullable |  |  |
| url_foto_serie_equipo | string | text | nullable |  |  |
| url_foto_potencia_interna | string | text | nullable |  |  |
| url_foto_contrasena | string | text | nullable |  |  |
| url_foto_test_velocidad | string | text | nullable |  |  |
| url_foto_estetico_equipos | string | text | nullable |  |  |
| url_foto_tv_pantalla | string | text | nullable |  |  |
| alerta_procesada | boolean | boolean | nullable | false |  |

**Foreign keys:**

- `contrato_id` → `contratos.id`
- `cuadrilla_id` → `cuadrillas.id`

---

## inventario_miscelaneo

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| producto_id | integer | integer | nullable |  | FK → catalogo_productos.id |
| ubicacion | string | text | nullable |  |  |
| cuadrilla_id | integer | integer | nullable |  | FK → cuadrillas.id |
| cantidad | number | numeric | nullable | 0 |  |

**Foreign keys:**

- `producto_id` → `catalogo_productos.id`
- `cuadrilla_id` → `cuadrillas.id`

---

## inventario_serializado

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| producto_id | integer | integer | nullable |  | FK → catalogo_productos.id |
| numero_serie | string | text | NOT NULL |  |  |
| estado | string | text | nullable | Disponible |  |
| ubicacion | string | text | nullable | Bodega |  |
| cuadrilla_id | integer | integer | nullable |  | FK → cuadrillas.id |
| contrato_id | integer | bigint | nullable |  | FK → contratos.id |
| fecha_ingreso | string | timestamp with time zone | nullable | now() |  |

**Foreign keys:**

- `producto_id` → `catalogo_productos.id`
- `cuadrilla_id` → `cuadrillas.id`
- `contrato_id` → `contratos.id`

---

## nominas

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| periodo | string | text | NOT NULL |  |  |
| descripcion | string | text | nullable |  |  |
| estado | string | text | nullable | borrador |  |
| total_pagar | number | numeric | nullable | 0 |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| fecha_inicio | string | date | nullable |  |  |
| fecha_fin | string | date | nullable |  |  |
| total_bruto | number | numeric | nullable | 0 |  |
| total_deducciones | number | numeric | nullable | 0 |  |
| total_neto | number | numeric | nullable | 0 |  |

---

## pagos_recibidos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| contrato_id | integer | bigint | nullable |  | FK → contratos.id |
| plan_pago_id | integer | integer | nullable |  |  |
| monto_pagado | number | numeric | NOT NULL |  |  |
| url_evidencia_pago | string | text | nullable |  |  |
| metodo_registro | string | public.modo_registro_pago | NOT NULL |  | enum: oficina, planta_interna |
| estado_validacion | string | public.estado_validacion_pago | nullable | pendiente | enum: pendiente, aprobado |
| fecha_pago | string | timestamp with time zone | nullable | now() |  |

**Foreign keys:**

- `contrato_id` → `contratos.id`

---

## paquetes

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| nombre | string | text | NOT NULL |  |  |
| velocidad | string | text | nullable |  |  |
| tecnologia | string | text | nullable |  |  |
| precio_mensual | number | numeric | NOT NULL |  |  |
| activo | boolean | boolean | nullable | true |  |

---

## perfiles

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| auth_user_id | string | uuid | nullable |  |  |
| nombre | string | text | NOT NULL |  |  |
| rol | string | public.rol_usuario | NOT NULL | administrador | enum: vendedor, auditor, oficina, planta, administrador |
| created_at | string | timestamp with time zone | nullable | now() |  |

---

## periodos_nomina

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  | FK → empleados.id |
| fecha_inicio | string | date | NOT NULL |  |  |
| fecha_fin | string | date | NOT NULL |  |  |
| dias_laborados | number | numeric | NOT NULL |  |  |
| nomina_id | integer | integer | nullable |  | FK → nominas.id |
| salario_devengado | number | numeric | nullable |  |  |
| viaticos | number | numeric | nullable |  |  |
| total_deducciones | number | numeric | nullable |  |  |
| neto_pagado | number | numeric | nullable |  |  |

**Foreign keys:**

- `empleado_id` → `empleados.id`
- `nomina_id` → `nominas.id`

---

## permisos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | bigint | NOT NULL |  | PK |
| auth_user_id | string | uuid | NOT NULL |  |  |
| dashboard | boolean | boolean | nullable | true |  |
| ventas | boolean | boolean | nullable | false |  |
| auditoria | boolean | boolean | nullable | false |  |
| cartera | boolean | boolean | nullable | false |  |
| cobros | boolean | boolean | nullable | false |  |
| vendedores | boolean | boolean | nullable | false |  |
| paquetes | boolean | boolean | nullable | false |  |
| mapa | boolean | boolean | nullable | false |  |
| historial_pagos | boolean | boolean | nullable | false |  |
| instalaciones | boolean | boolean | nullable | false |  |
| usuarios | boolean | boolean | nullable | false |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| updated_at | string | timestamp with time zone | nullable | now() |  |
| permisos | boolean | boolean | nullable | false |  |
| dashboard_diario | boolean | boolean | nullable | true |  |
| call_center | boolean | boolean | nullable | true |  |
| historial_instalaciones | boolean | boolean | nullable | false |  |
| vista_tecnico | boolean | boolean | nullable | false |  |
| programacion | boolean | boolean | nullable | false |  |
| clientes | boolean | boolean | nullable | true |  |
| rrhh | boolean | boolean | nullable | true |  |
| alertas | boolean | boolean | nullable | true |  |
| gastos | boolean | boolean | nullable |  |  |
| inventario | boolean | boolean | nullable |  |  |

---

## plan_pagos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| contrato_id | integer | bigint | nullable |  | FK → contratos.id |
| numero_cuota | integer | integer | NOT NULL |  |  |
| fecha_vencimiento | string | date | NOT NULL |  |  |
| monto_esperado | number | numeric | NOT NULL |  |  |
| pagado | boolean | boolean | nullable | false |  |
| confirmado | string | text | nullable |  |  |
| comprobante | string | text | nullable |  |  |
| fecha_pago | string | date | nullable |  |  |
| updated_at | string | date | nullable |  |  |
| cliente | string | text | nullable |  |  |
| referencia | string | text | nullable |  |  |
| nuevo_contrato_id_test | integer | bigint | nullable |  |  |
| usuariopago | string | text | nullable |  |  |
| alerta_procesada | boolean | boolean | nullable | false |  |
| inactiva | boolean | boolean | nullable |  |  |
| comentario | string | text | nullable |  |  |
| horapago | string | time without time zone | nullable |  |  |
| pagoreferencia | string | date | nullable |  |  |

**Foreign keys:**

- `contrato_id` → `contratos.id`

---

## prestaciones_acuerdos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  |  |
| monto_total | number | numeric | NOT NULL |  |  |
| numero_cuotas | integer | integer | NOT NULL |  |  |
| monto_por_cuota | number | numeric | NOT NULL |  |  |
| estado | string | text | nullable | En curso |  |
| fecha_acuerdo | string | date | nullable | CURRENT_DATE |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| urlacuerdo | string | text | nullable |  |  |

---

## prestaciones_pagos

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| acuerdo_id | integer | integer | nullable |  | FK → prestaciones_acuerdos.id |
| numero_cuota | integer | integer | NOT NULL |  |  |
| monto_cuota | number | numeric | NOT NULL |  |  |
| fecha_programada | string | date | NOT NULL |  |  |
| fecha_pago | string | date | nullable |  |  |
| estado | string | text | nullable | Pendiente |  |
| url_comprobante | string | text | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |

**Foreign keys:**

- `acuerdo_id` → `prestaciones_acuerdos.id`

---

## procesos_disciplinarios

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  | FK → empleados.id |
| causal | string | text | NOT NULL |  |  |
| resultado | string | text | nullable |  |  |
| fecha_sancion | string | date | NOT NULL |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| url_documento | string | text | nullable |  |  |

**Foreign keys:**

- `empleado_id` → `empleados.id`

---

## transacciones_inventario

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| tipo_movimiento | string | text | nullable |  |  |
| producto_id | integer | integer | nullable |  | FK → catalogo_productos.id |
| serial_id | integer | integer | nullable |  | FK → inventario_serializado.id |
| cantidad | number | numeric | NOT NULL |  |  |
| origen_detalle | string | text | nullable |  |  |
| destino_detalle | string | text | nullable |  |  |
| cuadrilla_id | integer | integer | nullable |  | FK → cuadrillas.id |
| contrato_id | integer | bigint | nullable |  | FK → contratos.id |
| usuario_registro | string | text | nullable |  |  |
| fecha | string | timestamp with time zone | nullable | now() |  |
| observaciones | string | text | nullable |  |  |

**Foreign keys:**

- `producto_id` → `catalogo_productos.id`
- `serial_id` → `inventario_serializado.id`
- `cuadrilla_id` → `cuadrillas.id`
- `contrato_id` → `contratos.id`

---

## vacaciones

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | integer | NOT NULL |  | PK |
| empleado_id | integer | integer | nullable |  | FK → empleados.id |
| fecha_inicio | string | date | NOT NULL |  |  |
| fecha_fin | string | date | NOT NULL |  |  |
| dias_solicitados | integer | integer | nullable |  |  |
| estado | string | text | nullable | pendiente |  |
| observaciones | string | text | nullable |  |  |
| created_at | string | timestamp with time zone | nullable | now() |  |
| fecha_solicitud | string | date | nullable | CURRENT_DATE |  |
| motivo | string | text | nullable |  |  |
| url_documento_firmado | string | text | nullable |  |  |

**Foreign keys:**

- `empleado_id` → `empleados.id`

---

## vendedores

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| id | integer | bigint | NOT NULL |  | PK |
| nombre | string | text | NOT NULL |  |  |
| activo | boolean | boolean | nullable |  |  |
| identificacion | string | text | nullable |  |  |

---

# Views

## v_cuota_vigente_detallada

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| pago_id | integer | integer | nullable |  | PK |
| contrato_id | integer | bigint | nullable |  | FK → contratos.id |
| numero_cuota | integer | integer | nullable |  |  |
| fecha_vencimiento | string | date | nullable |  |  |
| monto_esperado | number | numeric | nullable |  |  |
| comentario | string | text | nullable |  |  |
| nombre_completo | string | text | nullable |  |  |
| numero_identidad | string | text | nullable |  |  |
| direccion | string | text | nullable |  |  |
| dias_vencidos | integer | integer | nullable |  |  |
| estado | string | text | nullable |  |  |

**Foreign keys:**

- `contrato_id` → `contratos.id`

---

## vw_control_vacaciones

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| empleado_id | integer | integer | nullable |  | PK |
| nombre_completo | string | text | nullable |  |  |
| fecha_ingreso | string | date | nullable |  |  |
| anos_antiguedad | integer | integer | nullable |  |  |
| proximo_aniversario | string | date | nullable |  |  |
| dias_acumulados_ley | integer | integer | nullable |  |  |
| dias_tomados | integer | bigint | nullable |  |  |
| dias_pendientes | integer | bigint | nullable |  |  |

---

## vw_liquidacion_nomina

| Column | Type | Format | Nullable | Default | Notes |
|---|---|---|---|---|---|
| periodo_id | integer | integer | nullable |  | PK |
| empleado_id | integer | integer | nullable |  | PK |
| nombre_completo | string | text | nullable |  |  |
| identificacion | string | text | nullable |  |  |
| empresa | string | text | nullable |  |  |
| tipo_pago | string | text | nullable |  |  |
| valor_dia | number | numeric | nullable |  |  |
| viaticos_transporte | number | numeric | nullable |  |  |
| fecha_inicio | string | date | nullable |  |  |
| fecha_fin | string | date | nullable |  |  |
| dias_laborados | number | numeric | nullable |  |  |
| salario_devengado | number | numeric | nullable |  |  |
| total_adelantos | number | numeric | nullable |  |  |
| total_deducciones | number | numeric | nullable |  |  |
| neto_a_pagar | number | numeric | nullable |  |  |

---

