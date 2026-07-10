create table public.inventario_serializado (
  id integer generated always as identity not null,
  producto_id integer null,
  numero_serie text not null,
  estado text null default 'Disponible'::text,
  ubicacion text null default 'Bodega'::text,
  cuadrilla_id integer null,
  contrato_id bigint null,
  fecha_ingreso timestamp with time zone null default now(),
  constraint inventario_serializado_pkey primary key (id),
  constraint inventario_serializado_numero_serie_key unique (numero_serie),
  constraint inventario_serializado_contrato_id_fkey foreign KEY (contrato_id) references contratos (id),
  constraint inventario_serializado_cuadrilla_id_fkey foreign KEY (cuadrilla_id) references cuadrillas (id),
  constraint inventario_serializado_producto_id_fkey foreign KEY (producto_id) references catalogo_productos (id),
  constraint inventario_serializado_estado_check check (
    (
      estado = any (
        array[
          'Disponible'::text,
          'Instalado'::text,
          'Defectuoso'::text,
          'Retornado'::text
        ]
      )
    )
  ),
  constraint inventario_serializado_ubicacion_check check (
    (
      ubicacion = any (
        array[
          'Bodega'::text,
          'Cuadrilla'::text,
          'Cliente'::text
        ]
      )
    )
  )
) TABLESPACE pg_default;
