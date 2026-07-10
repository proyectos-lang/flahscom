-- Reset the sequence for clientes table to the maximum ID + 1
SELECT setval('clientes_id_seq', COALESCE((SELECT MAX(id) FROM clientes), 0) + 1, false);
