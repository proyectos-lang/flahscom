-- Run this in the Supabase SQL Editor and paste the result back.
-- It returns the exact SQL definition of the view that drives the
-- "estado" column (Al día / Pendiente cuota / Cortar / Recuperar equipo)
-- shown in the Cartera (Portfolio) report.
select pg_get_viewdef('public.v_cuota_vigente_detallada'::regclass, true) as definicion;
