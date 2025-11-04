# Inspector 360° - Sistema de Inspección Técnica

Sistema integral de gestión de inspecciones técnicas de equipos según formato FOR-ATA-057.

## Características Principales

- ✅ Autenticación y autorización con Supabase
- ✅ Wizard de 4 pasos para crear inspecciones
- ✅ Checklist de 50 items por equipo
- ✅ Firmas digitales de supervisor
- ✅ Generación de PDF con formato corporativo
- ✅ Dashboard de cumplimiento con gráficos
- ✅ Gestión de usuarios (CRUD completo)
- ✅ 3 roles: Admin, Supervisor, SIG
- ✅ RLS (Row Level Security) en base de datos

## Stack Tecnológico

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS v4
- **Backend**: Supabase (PostgreSQL + Auth + Storage)
- **Validación**: Zod + React Hook Form
- **PDF**: jsPDF + jsPDF-AutoTable
- **Gráficos**: Recharts
- **UI**: shadcn/ui + Radix UI

## Instalación

1. Clonar el repositorio
2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno (.env.local):
   ```
   NEXT_PUBLIC_SUPABASE_URL=tu_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_key
   ```

4. Ejecutar el setup de Supabase (ver SUPABASE_SETUP.sql)

5. Iniciar el servidor de desarrollo:
   ```bash
   npm run dev
   ```

## Estructura del Proyecto

```
inspector360/
├── app/                    # App Router (Next.js 14)
│   ├── (auth)/            # Rutas de autenticación
│   └── (dashboard)/       # Rutas protegidas
├── components/            # Componentes React
│   ├── forms/            # Formularios del wizard
│   ├── layout/           # Layout components
│   ├── settings/         # Componentes de configuración
│   └── ui/               # UI components (shadcn)
├── lib/                   # Utilidades y servicios
│   ├── services/         # Servicios de API
│   ├── pdf/              # Generador de PDF
│   └── validations/      # Esquemas de validación
└── types/                # Definiciones de TypeScript
```

## Roles y Permisos

- **Admin**: Acceso completo, gestión de usuarios
- **Supervisor**: Crear inspecciones para su estación
- **SIG**: Solo lectura de todas las estaciones

## Flujo de Inspección

1. **Paso 1**: Información general (fecha, tipo, inspector)
2. **Paso 2**: Agregar equipos a inspeccionar
3. **Paso 3**: Completar checklist de 15 items por equipo
4. **Paso 4**: Firma del supervisor y finalización

## Licencia

Proyecto privado - Todos los derechos reservados
