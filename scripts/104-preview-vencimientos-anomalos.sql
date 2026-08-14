-- READ-ONLY. Correr PRIMERO en el SQL Editor de Supabase para ver el alcance
-- antes de aplicar 105-fix-vencimientos-al-15.sql.
--
-- Contexto: 157 contratos se generaron con las fechas de vencimiento "corridas"
-- (días 11 a 16 en vez del 15 de cada mes). Esto hace que en el Centro de
-- Alertas se muestre "venció 14 jul" y que la reconexión (y el corte de
-- Cartera) se disparen un día antes de lo debido.

-- 1) Cuántas cuotas vencen en un día distinto al 15, y en qué día caen.
select
  extract(day from fecha_vencimiento)::int as dia_del_mes,
  count(*) as cuotas
from public.plan_pagos
where extract(day from fecha_vencimiento) <> 15
group by 1
order by 1;

-- 2) Cuántos contratos distintos están afectados.
select count(distinct contrato_id) as contratos_afectados
from public.plan_pagos
where extract(day from fecha_vencimiento) <> 15;

-- 3) Muestra del cronograma de un contrato afectado (para validar el patrón).
select numero_cuota, fecha_vencimiento
from public.plan_pagos
where contrato_id = 4713
order by fecha_vencimiento;
