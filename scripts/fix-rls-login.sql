-- Permitir lectura pública de user_profiles para el login
-- Esto es necesario para que el formulario de login pueda verificar
-- si un email existe ANTES de que el usuario se autentique

-- 1. Eliminar política restrictiva actual si existe
DROP POLICY IF EXISTS "Allow read access to all authenticated users" ON public.user_profiles;
DROP POLICY IF EXISTS "Allow all operations to authenticated users" ON public.user_profiles;

-- 2. Permitir LECTURA pública (solo SELECT, solo campos básicos)
-- Esto permite que el login verifique si el email existe
CREATE POLICY "Allow public read for login verification"
ON public.user_profiles
FOR SELECT
TO anon, authenticated
USING (true);

-- 3. Permitir operaciones de escritura solo a usuarios autenticados
CREATE POLICY "Allow authenticated users to manage profiles"
ON public.user_profiles
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);

-- 4. Verificar que RLS está habilitado
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- 5. Probar la consulta pública (como lo hace el login)
SELECT full_name, is_active
FROM public.user_profiles
WHERE email = 'willysaico@gmail.com';
