-- Script de debugging para verificar formato de emails
-- Ejecutar en Supabase SQL Editor

-- Ver todos los usuarios y sus emails exactos
SELECT
  up.id,
  up.email,
  LENGTH(up.email) as email_length,
  au.email as auth_email,
  LENGTH(au.email) as auth_email_length,
  up.full_name,
  up.role,
  up.is_active
FROM public.user_profiles up
INNER JOIN auth.users au ON up.id = au.id;

-- Buscar específicamente el email que estás intentando
SELECT
  id,
  email,
  LENGTH(email) as email_length,
  LOWER(TRIM(email)) as normalized_email,
  full_name,
  is_active
FROM public.user_profiles
WHERE email ILIKE '%wilber%';

-- Ver si hay espacios o caracteres especiales
SELECT
  id,
  email,
  encode(email::bytea, 'hex') as email_hex,
  full_name
FROM public.user_profiles;
