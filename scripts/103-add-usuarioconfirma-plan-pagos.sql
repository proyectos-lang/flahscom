-- Adds a column to record WHO approved (confirmed) each payment, mirroring the
-- existing `usuariopago` column that records who registered the payment.
--
-- Run this in the Supabase SQL Editor BEFORE deploying the code that writes it.
-- Safe to run more than once (IF NOT EXISTS).
alter table public.plan_pagos
  add column if not exists usuarioconfirma text;
