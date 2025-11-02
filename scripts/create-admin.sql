-- Script para crear el primer usuario administrador
-- Ejecuta esto en el SQL Editor de Supabase

-- 1. Primero crea el usuario en auth.users (reemplaza con tu email y contraseña)
-- Ve a Authentication > Users > Add user y crea el usuario
-- O usa este SQL (requiere service_role):

-- 2. Luego inserta en la tabla users
INSERT INTO public.users (id, email, full_name, role, station, is_active)
VALUES (
  (SELECT id FROM auth.users WHERE email = 'admin@inspector360.com' LIMIT 1),
  'admin@inspector360.com',
  'Administrador',
  'admin',
  NULL,
  true
);

-- Nota: Primero debes crear el usuario en Authentication > Users con:
-- Email: admin@inspector360.com
-- Password: Admin123456
-- Luego ejecuta este SQL
