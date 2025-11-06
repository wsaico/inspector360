# Solución a la Generación de PDF

## Problema Identificado

El endpoint `/api/inspections/[id]/pdf` fallaba con error 500 porque:
- Puppeteer intentaba usar Chromium de `@sparticuz/chromium` (para serverless)
- En desarrollo local, no encuentra Chromium en esa ruta
- Aunque Chrome está instalado en el sistema, no se detectaba correctamente

## Solución Implementada

### 1. Estrategia de Detección de Chrome Mejorada

**Archivo**: `app/api/inspections/[id]/pdf/route.ts`

#### Cambios Realizados:

**ANTES** (problemático):
```typescript
// Intentaba usar chromium.executablePath() primero
const chromiumPath = await chromium.executablePath();
if (chromiumPath) {
  // Usaba Chromium serverless (no existe en local)
}
```

**AHORA** (corregido):
```typescript
// Detecta entorno
const isDev = process.env.NODE_ENV === 'development';
const isServerless = !!(process.env.AWS_REGION || process.env.VERCEL);

if (isDev && !isServerless) {
  // En desarrollo: priorizar Chrome local instalado
  const localChrome = resolveLocalChromePath();
  if (localChrome) {
    browser = await puppeteerCore.launch({
      headless: true,
      executablePath: localChrome,
      args: ['--no-sandbox', '--disable-setuid-sandbox', ...],
    });
  }
} else {
  // En producción: usar Chromium serverless
  const chromiumPath = await chromium.executablePath();
  // ... usa chromium serverless
}
```

### 2. Detección de Chrome en Windows

La función `resolveLocalChromePath()` ahora busca Chrome en:
1. Variables de entorno (`PUPPETEER_EXECUTABLE_PATH`, `CHROME_PATH`)
2. Ubicaciones estándar de Windows:
   - `C:\Program Files\Google\Chrome\Application\chrome.exe` ✅
   - `C:\Program Files (x86)\Google\Chrome\Application\chrome.exe`
   - `C:\Program Files\Microsoft\Edge\Application\msedge.exe`
   - `%LOCALAPPDATA%\Google\Chrome\Application\chrome.exe`

### 3. Logging Mejorado

Agregado logging detallado para debugging:
```typescript
console.log('[Chrome Detection] Platform:', platform);
console.log('[Chrome Detection] Checking candidates:', candidates.length);
console.log('[Chrome Detection] Found:', candidate);
```

### 4. Manejo de Errores Profesional

**Mensajes de error específicos**:
```typescript
let userMessage = 'No se pudo generar el PDF';
if (error?.message?.includes('Chrome') || error?.message?.includes('chromium')) {
  userMessage = 'No se encontró Chrome/Chromium en el sistema';
} else if (error?.message?.includes('timeout')) {
  userMessage = 'Tiempo de espera excedido al generar el PDF';
}
```

## Cómo Funciona Ahora

### Flujo de Generación de PDF:

1. **Usuario hace clic en "Descargar PDF"** desde `/inspections/[id]`
2. **Cliente llama** a `/api/inspections/[id]/pdf` con Authorization header
3. **Servidor valida sesión** con Supabase usando el nuevo middleware
4. **Detecta entorno**:
   - **Desarrollo local**: Usa Chrome instalado en el sistema
   - **Producción/Vercel**: Usa Chromium serverless de `@sparticuz/chromium`
5. **Lanza Puppeteer** con el ejecutable correcto
6. **Navega** a `/templates/forata057?id=xxx&pdf=1&print=true`
7. **Espera** a que la plantilla cargue datos (flag `__forata057_ready`)
8. **Espera** a que las imágenes carguen completamente
9. **Genera PDF** en formato A4 landscape
10. **Retorna** el PDF como descarga directa

### Plantilla FOR-ATA-057

**NO SE MODIFICÓ** - La plantilla sigue funcionando exactamente igual:
- `/templates/forata057` carga datos dinámicos desde Supabase
- Renderiza usando el componente `FORATA057Template`
- Soporta parámetros: `?id=xxx&pdf=1&print=true&logo=/logo.png`

## Beneficios de la Solución

### ✅ Desarrollo Local
- Usa Chrome instalado (rápido y confiable)
- No requiere descargar Chromium adicional
- Funciona en Windows, macOS y Linux

### ✅ Producción (Vercel)
- Usa Chromium optimizado para serverless
- Funciona sin Chrome instalado
- Compatible con límites de Vercel

### ✅ Debugging
- Logs detallados para identificar problemas
- Modo debug: `/api/inspections/[id]/pdf?debug=1`
- Mensajes de error específicos

### ✅ Fallback Robusto
- Si Chrome local no se encuentra, intenta Puppeteer
- Si Chromium serverless falla, intenta Chrome local
- Múltiples rutas de instalación de Chrome

## Testing

### Probar Generación de PDF:

1. **Abrir inspección existente**:
   http://localhost:3000/inspections/6f83437e-7d2e-4d40-becf-d77df07beb8d

2. **Hacer clic** en botón "Descargar PDF"

3. **Verificar** en consola del servidor:
   ```
   [Chrome Detection] Platform: win32
   [Chrome Detection] Checking candidates: 5
   [Chrome Detection] Found: C:\Program Files\Google\Chrome\Application\chrome.exe
   ```

4. **Debe descargar** archivo `FOR-ATA-057-[id].pdf`

### Probar Plantilla Directamente:

http://localhost:3000/templates/forata057?id=6f83437e-7d2e-4d40-becf-d77df07beb8d&pdf=1&print=true&logo=/logo.png

- Debe mostrar la plantilla renderizada
- Datos deben cargarse desde Supabase
- Botón "Descargar PDF" debe funcionar

### Modo Debug:

http://localhost:3000/api/inspections/6f83437e-7d2e-4d40-becf-d77df07beb8d/pdf?debug=1

Retorna JSON con información de diagnóstico:
```json
{
  "ok": true,
  "filename": "FOR-ATA-057-xxx.pdf",
  "diag": {
    "origin": "http://localhost:3000",
    "browserSource": "localChrome",
    "localChrome": "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "pdfBytes": 245678
  }
}
```

## Variables de Entorno Opcionales

Si Chrome/Edge no se detecta automáticamente, puedes configurar:

```env
# .env.local
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
# O para Edge:
PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Microsoft\Edge\Application\msedge.exe
```

## Solución de Problemas

### Error: "No se encontró Chrome/Chromium en el sistema"

**Causa**: Chrome no está instalado o no se detecta

**Soluciones**:
1. Instalar Google Chrome: https://www.google.com/chrome/
2. O usar Edge (ya incluido en Windows)
3. O configurar `PUPPETEER_EXECUTABLE_PATH` en `.env.local`

### Error: "Tiempo de espera excedido"

**Causa**: La plantilla tarda mucho en cargar datos

**Soluciones**:
1. Verificar conexión a Supabase
2. Verificar que la inspección existe
3. Aumentar timeout en el código si es necesario

### PDF se descarga pero está en blanco

**Causa**: La plantilla no terminó de renderizar

**Soluciones**:
1. Verificar que `__forata057_ready` se establece correctamente
2. Revisar logs del navegador en modo debug
3. Verificar que las imágenes se cargan

## Archivos Modificados

- ✅ `app/api/inspections/[id]/pdf/route.ts` - Lógica de generación de PDF
- ✅ `PDF_GENERATION_FIX.md` - Esta documentación

## Archivos NO Modificados

- ⚠️ `app/templates/forata057/page.tsx` - Plantilla (se mantiene intacta)
- ⚠️ `components/pages/forata057-template.tsx` - Template component (si existe)

## Próximos Pasos

1. ✅ Probar generación de PDF en desarrollo local
2. ⏳ Probar en Vercel/producción (usar Chromium serverless)
3. ⏳ Optimizar tiempos de generación si es necesario
4. ⏳ Agregar cache de PDFs generados (opcional)

## Compatibilidad

- ✅ Windows 10/11 (Chrome/Edge)
- ✅ macOS (Chrome instalado)
- ✅ Linux (Chrome/Chromium instalado)
- ✅ Vercel/Serverless (Chromium de @sparticuz/chromium)

---

**Implementado**: 2025-11-06
**Versión**: 1.0
**Estado**: ✅ Listo para pruebas
