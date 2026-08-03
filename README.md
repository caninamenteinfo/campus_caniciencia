# CaninaMente Campus

Campus virtual de estudio para los cursos de **CaninaMente** (avalados por
Florida Global University). Los alumnos leen el material de su curso
organizado por módulos, resuelven dudas con un asistente de IA que responde
**únicamente** con el contenido del módulo activo, y generan tests de
autoevaluación de 5 preguntas. El instructor gestiona el material (incluida
la carga de PDFs) y las ediciones del curso (código de acceso, fechas y
aforo) desde un panel protegido.

## Stack

- **Next.js 16** (App Router) + TypeScript + Tailwind CSS v4
- **Supabase** (Postgres + Auth) para persistencia y login del instructor
- **API de Anthropic (Claude)** para el asistente de estudio y el generador de tests
- Extracción de PDF en servidor con `pdf-parse`
- Despliegue en **Vercel**

## Cómo funciona el acceso

- **Alumnos**: entran con su nombre + un código de acceso de 8 caracteres
  que genera el instructor al crear una *edición* del curso. El código solo
  funciona dentro de la ventana de fechas de esa edición y hasta un aforo
  máximo (10 por defecto); pasada la fecha de fin, el acceso se cierra
  automáticamente. La sesión es una cookie firmada (JWT) que caduca en la
  fecha de fin de la edición.
- **Instructor**: login real con email + contraseña gestionado por Supabase
  Auth (nada de PIN ni credenciales en el código fuente). Solo las cuentas
  marcadas con rol `instructor` en la tabla `profiles` pueden entrar al panel.

## Configuración local

1. Copia `.env.example` a `.env.local` y rellena las variables:

   ```bash
   cp .env.example .env.local
   ```

   - `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` /
     `SUPABASE_SERVICE_ROLE_KEY`: en el proyecto de Supabase, *Project
     Settings → API*.
   - `ANTHROPIC_API_KEY`: desde [console.anthropic.com](https://console.anthropic.com).
   - `SESSION_SECRET`: cadena aleatoria larga (por ejemplo `openssl rand -base64 32`).

2. Instala dependencias y arranca en local:

   ```bash
   npm install
   npm run dev
   ```

## Configurar Supabase (una vez)

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Ejecuta la migración `supabase/migrations/0001_init.sql` en el **SQL
   Editor** del proyecto (crea las tablas `profiles`, `courses`,
   `course_editions` y `edition_students`).
3. Crea la cuenta del instructor: **Authentication → Users → Add user**
   (email + contraseña).
4. Copia su `User UID` y ejecuta el bloque de
   `supabase/migrations/0002_seed_instructor.sql.example` (sustituyendo el
   UID) en el SQL Editor, para darle rol de instructor.
5. Con eso ya puedes entrar en `/instructor/login` con ese email y contraseña.

El curso se siembra automáticamente (nombre y material del Diplomado piloto)
la primera vez que el instructor abre el panel; desde ahí puede
renombrarlo y sustituir el material por el de cualquier otro curso, sea
subiendo un PDF o pegando el texto a mano.

## Desplegar en Vercel

1. Sube este repositorio a GitHub (ya está en la rama indicada) e impórtalo
   en [vercel.com/new](https://vercel.com/new).
2. En **Project Settings → Environment Variables** añade las mismas
   variables que en `.env.local` (usa una `SESSION_SECRET` distinta y
   propia de producción).
3. Despliega. Vercel detecta Next.js automáticamente, no hace falta
   configuración adicional.
4. Verifica `/instructor/login` y el flujo de acceso de alumnos en la URL
   de producción antes de repartir códigos.

## Estructura relevante

```
src/
  app/                    Rutas (App Router): acceso, dashboard, instructor, API
  components/             UI (Sidebar, Dashboard, Material, Asistente, Tests, panel instructor)
  lib/
    modules.ts             Detección de módulos "MÓDULO N" + material semilla
    courses.ts             Acceso a datos de curso/ediciones (Supabase, service role)
    claude.ts               Llamadas server-side a la API de Anthropic
    session.ts               Cookie de sesión de alumno (JWT firmado)
    auth.ts                   Comprobación de rol instructor
    supabase/                Clientes de Supabase (admin / server / browser)
supabase/migrations/       SQL de la base de datos
```
