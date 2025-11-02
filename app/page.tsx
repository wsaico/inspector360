import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigir al dashboard (el layout manejará la autenticación)
  redirect('/dashboard');
}
