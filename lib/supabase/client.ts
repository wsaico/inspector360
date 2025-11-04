import { createBrowserClient } from '@supabase/ssr';

// Cliente de Supabase "seguro": evita romper la app si faltan ENV
export const supabase = typeof window !== 'undefined'
  ? (() => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

      if (url && key) {
        return createBrowserClient(url, key);
      }

      // Fallback mínimo para no romper la UI en build/desarrollo sin ENV
      console.error('@supabase/ssr: Faltan NEXT_PUBLIC_SUPABASE_URL y/o NEXT_PUBLIC_SUPABASE_ANON_KEY');
      // Utilizamos un stub que simula el builder de Postgrest
      const makeSelectBuilder = () => {
        const result = { data: [], error: null };
        return {
          then(resolve: any) { resolve(result); },
          catch() { return Promise.resolve(result); },
          eq() { return Promise.resolve(result); },
          order() { return Promise.resolve(result); },
          range() { return Promise.resolve(result); },
          single() { return Promise.resolve({ data: null, error: null }); },
        } as any;
      };

      const makeMutationBuilder = () => {
        return {
          select() { return { single() { return Promise.resolve({ data: null, error: null }); } } as any; },
          eq() { return { select() { return { single() { return Promise.resolve({ data: null, error: null }); } } as any; } } as any; },
        } as any;
      };

      return {
        auth: {
          async getSession() {
            return { data: { session: null }, error: new Error('Missing Supabase env') } as any;
          },
          async signInWithPassword() {
            return { data: { user: null }, error: new Error('Missing Supabase env') } as any;
          },
          async signOut() {
            return { error: null } as any;
          },
          onAuthStateChange() {
            return { data: { subscription: { unsubscribe() {} } } } as any;
          },
        },
        from() {
          return {
            select() { return makeSelectBuilder(); },
            insert() { return makeMutationBuilder(); },
            update() { return makeMutationBuilder(); },
            delete() { return Promise.resolve({ data: null, error: null }); },
          } as any;
        },
        storage: {
          from() {
            return {
              getPublicUrl() {
                return { data: { publicUrl: '' } } as any;
              },
            } as any;
          },
        },
      } as any;
    })()
  : (null as any);
