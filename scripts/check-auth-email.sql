-- Ver qué email está registrado en auth.users
SELECT
  id,
  email,
  created_at,
  raw_user_meta_data
FROM auth.users
WHERE email LIKE '%saico%';
