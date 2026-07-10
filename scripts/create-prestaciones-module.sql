-- Prestaciones Ex Empleados: master agreements + installment payments
-- Run this in the Supabase SQL editor. All statements are idempotent.

-- Canonical prestaciones_acuerdos table (matches production schema).
-- Note: empleado_id is a plain integer (no FK) so the API performs the
-- empleados join manually. The manual ex-employee name/cedula captured at
-- registration is upserted into the empleados table by the POST endpoint.
create table if not exists public.prestaciones_acuerdos (
  id integer generated always as identity primary key,
  empleado_id integer,
  monto_total numeric(12, 2) not null,
  numero_cuotas integer not null,
  monto_por_cuota numeric(12, 2) not null,
  estado text default 'En curso' check (estado in ('En curso','Finalizado','Anulado')),
  fecha_acuerdo date default current_date,
  created_at timestamptz default now(),
  urlacuerdo text
);

-- Installments generated automatically when an agreement is created.
create table if not exists public.prestaciones_pagos (
  id bigint generated always as identity primary key,
  acuerdo_id integer not null references public.prestaciones_acuerdos(id) on delete cascade,
  numero_cuota integer not null,
  monto numeric(14, 2) not null check (monto > 0),
  fecha_programada date not null,
  fecha_pago date,
  estado text not null default 'Pendiente' check (estado in ('Pendiente','Pagado')),
  url_comprobante text,
  notas text,
  created_at timestamptz not null default now(),
  unique (acuerdo_id, numero_cuota)
);

create index if not exists idx_prestaciones_pagos_acuerdo on public.prestaciones_pagos(acuerdo_id);
create index if not exists idx_prestaciones_acuerdos_empleado on public.prestaciones_acuerdos(empleado_id);
create index if not exists idx_prestaciones_acuerdos_estado on public.prestaciones_acuerdos(estado);
