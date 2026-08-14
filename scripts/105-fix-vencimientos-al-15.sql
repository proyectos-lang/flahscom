-- Corrige el bug de generación que dejó las fechas de vencimiento "corridas"
-- (días 11 a 16) en 157 contratos. Todas las cuotas deben vencer el 15 de su
-- mes. Cada cuota vive en un mes distinto, por lo que fijar el día 15 no crea
-- colisiones ni cambia el mes.
--
-- Correr 104-preview-vencimientos-anomalos.sql PRIMERO para ver el alcance.
--
-- date_trunc('month', fecha) = día 1 del mes; + 14 días = el 15 del mismo mes.

update public.plan_pagos
set fecha_vencimiento = (date_trunc('month', fecha_vencimiento) + interval '14 days')::date
where extract(day from fecha_vencimiento) <> 15;

-- Verificación posterior: debe devolver 0 filas.
select count(*) as cuotas_fuera_del_15
from public.plan_pagos
where extract(day from fecha_vencimiento) <> 15;
