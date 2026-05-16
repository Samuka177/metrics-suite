
-- 1) Adicionar novos papéis (motorista, ajudante)
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'motorista';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'ajudante';
