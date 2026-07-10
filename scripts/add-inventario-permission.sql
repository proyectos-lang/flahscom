-- Add `inventario` permission column for the new Bodega module.
-- Run this once in Supabase SQL editor.
alter table public.permisos
  add column if not exists inventario boolean not null default false;

-- Optional: grant the permission to admins/superadmins by name
update public.permisos p
set inventario = true
where exists (
  select 1
  from public.perfiles pe
  where pe.auth_user_id = p.auth_user_id
    and pe.rol in ('administrador')
);
