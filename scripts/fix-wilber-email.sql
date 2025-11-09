-- Actualizar el email de Wilber en user_profiles
-- Solo si tu email correcto es wilbersaico@gmail.com

UPDATE public.user_profiles
SET
  email = 'wilbersaico@gmail.com',
  updated_at = NOW()
WHERE email = 'willysaico@gmail.com';

-- Verificar el cambio
SELECT id, email, full_name, role, is_active
FROM public.user_profiles
WHERE email = 'wilbersaico@gmail.com';
