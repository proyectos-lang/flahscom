-- Fixes the "Cortar" (service cutoff) date logic in v_cuota_vigente_detallada.
--
-- PROBLEM: the estado CASE compared CURRENT_DATE - fecha_vencimiento against a
-- fixed number of days (15 for contrato_id >= 4487, 30 for older contracts).
-- Since calendar months don't all have the same length (28-31 days), a fixed
-- day count doesn't reliably land on day 15 of the following month:
--   - fecha_vencimiento = 2026-05-15 + 30 days  -> 2026-06-14 (1 day early)
--   - fecha_vencimiento = 2026-02-15 + 30 days  -> 2026-03-17 (2 days late)
-- The >= 15 days rule for newer contracts (id >= 4487) was worse: it cut
-- service ~15 days too early relative to the intended "cut on the 15th"
-- policy (e.g. due 2026-06-15 -> cut 2026-06-30 instead of 2026-07-15).
--
-- FIX: compare CURRENT_DATE against fecha_vencimiento + interval '1 month'
-- (and + '2 months' for Recuperar equipo). Postgres date + interval 'N months'
-- preserves the day-of-month, so it always lands on the 15th regardless of
-- how many days are in the intervening month(s). This also removes the
-- contrato_id >= 4487 special case, unifying the rule for all contracts.
--
-- Run scripts/101-preview-fix-corte-impacto.sql FIRST to see the impact.

create or replace view public.v_cuota_vigente_detallada as
with
  cuotas_pendientes as (
    select
      p.id,
      p.contrato_id,
      p.numero_cuota,
      p.fecha_vencimiento,
      p.monto_esperado,
      p.pagado,
      p.confirmado,
      p.comprobante,
      p.fecha_pago,
      p.updated_at,
      p.cliente,
      p.referencia,
      p.nuevo_contrato_id_test,
      p.usuariopago,
      p.alerta_procesada,
      p.inactiva,
      p.comentario,
      row_number() over (
        partition by
          p.contrato_id
        order by
          p.fecha_vencimiento,
          p.numero_cuota
      ) as ranking_pendiente
    from
      plan_pagos p
    where
      (
        p.pagado = false
        or p.pagado is null
      )
      and (
        p.inactiva is false
        or p.inactiva is null
      )
  )
select
  cp.id as pago_id,
  cp.contrato_id,
  cp.numero_cuota,
  cp.fecha_vencimiento,
  cp.monto_esperado,
  cp.comentario,
  c.nombre_completo,
  c.numero_identidad,
  c.direccion,
  case
    when CURRENT_DATE > cp.fecha_vencimiento then CURRENT_DATE - cp.fecha_vencimiento
    else 0
  end as dias_vencidos,
  case
    when CURRENT_DATE >= (cp.fecha_vencimiento + interval '2 months')::date then 'Recuperar equipo'::text
    when CURRENT_DATE >= (cp.fecha_vencimiento + interval '1 month')::date then 'Cortar'::text
    when CURRENT_DATE > cp.fecha_vencimiento then 'Pendiente cuota'::text
    else 'Al día'::text
  end as estado
from
  cuotas_pendientes cp
  join clientes c on cp.contrato_id = c.id
where
  cp.ranking_pendiente = 1;
