import { redirect } from 'next/navigation';

export default function Home() {
  // Redirección server-side directa al dashboard.
  // El layout del grupo (dashboard) se encarga de validar sesión y, si no hay,
  // redirige a /login. Así evitamos pantallas en blanco o spinners innecesarios.
  redirect('/dashboard');
}
