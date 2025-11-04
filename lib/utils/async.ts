/**
 * Utilidad: withTimeout
 * Envuelve una promesa y corta la espera después de `ms` milisegundos.
 * Evita spinners infinitos en llamadas de datos lentas.
 */
export async function withTimeout<T>(promise: Promise<T>, ms = 8000): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => setTimeout(() => resolve(null), ms)),
  ]);
}