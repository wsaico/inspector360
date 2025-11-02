import { redirect } from 'next/navigation';

export default function Home() {
  // Redirigir al login o dashboard según autenticación
  redirect('/login');
}
