-- Run this FIRST in the Supabase SQL Editor, before applying 102-fix-corte-view.sql.
-- It's read-only: shows how many rows would change estado under the corrected
-- (calendar-month-based) cutoff logic vs. the current (fixed-day-count) logic,
-- without modifying anything.
select
  v.estado as estado_actual,
  case
    when CURRENT_DATE >= (v.fecha_vencimiento + interval '2 months')::date then 'Recuperar equipo'
    when CURRENT_DATE >= (v.fecha_vencimiento + interval '1 month')::date then 'Cortar'
    when CURRENT_DATE > v.fecha_vencimiento then 'Pendiente cuota'
    else 'Al día'
  end as estado_nuevo,
  count(*) as cantidad_contratos
from v_cuota_vigente_detallada v
group by 1, 2
order by 1, 2;

-- Detail view of exactly which contracts would flip out of "Cortar"
-- (useful if you need to double-check specific accounts before/after).
select
  v.contrato_id,
  v.nombre_completo,
  v.fecha_vencimiento,
  v.dias_vencidos,
  v.estado as estado_actual,
  case
    when CURRENT_DATE >= (v.fecha_vencimiento + interval '2 months')::date then 'Recuperar equipo'
    when CURRENT_DATE >= (v.fecha_vencimiento + interval '1 month')::date then 'Cortar'
    when CURRENT_DATE > v.fecha_vencimiento then 'Pendiente cuota'
    else 'Al día'
  end as estado_nuevo
from v_cuota_vigente_detallada v
where v.estado = 'Cortar'
order by v.fecha_vencimiento;
