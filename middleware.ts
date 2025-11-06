import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * Middleware para refrescar tokens de Supabase automáticamente
 *
 * IMPORTANTE: Este middleware es CRÍTICO para evitar sesiones fantasma
 * - Refresca los tokens antes de que expiren
 * - Actualiza las cookies con la sesión más reciente
 * - Valida la sesión en cada request
 */
export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANTE: No usar getSession() - siempre usar getUser()
  // getUser() valida con el servidor, getSession() solo lee localStorage
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  // Rutas públicas que NO requieren autenticación
  const publicPaths = ['/login', '/register', '/forgot-password', '/templates'];
  const isPublicPath = publicPaths.some(path => pathname.startsWith(path));

  // Si no hay usuario y está intentando acceder a rutas protegidas, redirigir a login
  if (!user && !isPublicPath) {
    console.log('[Middleware] No user detected, redirecting to login from:', pathname);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Si hay usuario y está en login, redirigir a dashboard
  if (user && pathname === '/login') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
