# CaninaMente — Content Manager

El "cerebro operacional" de contenido de CaninaMente: propone temas
semanales basados en el documento MAESTRO de estrategia, guía el flujo de
producción de 4 horas (grabación → captions → diseño en Canva →
programación), trackea resultados y motiva con racha + badges.

## Stack

- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + Framer Motion
- **Backend**: Node.js + Express + TypeScript
- **Base de datos / Auth**: Supabase (Postgres + Google OAuth)
- **IA**: Claude (Anthropic) para propuestas semanales, captions e insights
- **Diseño**: Canva Connect API (autofill de brand template + export a MP4)
- **Documentos**: Google Drive/Docs API (lectura del documento MAESTRO y guías)
- **Notificaciones**: Web Push (alarmas semanales del flujo de producción)

## Estructura

```
frontend/     React + Vite (puerto 3000)
backend/      Express API (puerto 5000)
supabase/     migraciones SQL
```

## Requisitos previos

- **Node.js 20 o superior** y **npm 10+** (`node --version`, `npm --version`).
- Una cuenta de **Google** (la que vas a usar para loguearte en la app y
  que tiene acceso al Drive con los documentos de estrategia).
- Cuentas (gratuitas para empezar) en **Supabase**, **Google Cloud
  Console**, **Anthropic Console** y, opcionalmente, **Canva Developers**.

---

## Guía de instalación paso a paso

### 0. Clonar e instalar dependencias

```bash
git clone <URL-del-repo>
cd campus_caniciencia
git checkout claude/caninamente-content-app-kydf9n   # si no es ya la rama activa
npm install
```

Esto instala **ambos workspaces** (`frontend/` y `backend/`) de una sola
vez gracias a los npm workspaces del `package.json` raíz.

---

### 1. Supabase (base de datos + login)

1. Entrá a [supabase.com](https://supabase.com) → **New project**. Elegí
   nombre, contraseña de base de datos (guardala) y región.
2. Cuando el proyecto esté listo, andá a **SQL Editor** (menú lateral) →
   **New query**, pegá el contenido completo de
   `supabase/migrations/0001_init.sql` y ejecutalo (▶ Run). Esto crea las
   tablas (`weekly_cycles`, `proposals`, `reels`, `weekly_metrics`,
   `weekly_feedback`, `integration_tokens`, `push_subscriptions`,
   `profiles`), sus políticas de Row Level Security y el trigger que crea
   el `profile` automáticamente al primer login. Repetí el mismo paso con
   `supabase/migrations/0002_reel_category_badges.sql` (agrega la columna
   `category` a `reels`, usada por el sistema de badges).
3. Andá a **Project Settings → API** y copiá estos tres valores (los vas a
   necesitar en el paso 5):
   - `Project URL` → `SUPABASE_URL` / `VITE_SUPABASE_URL`
   - `anon public` key → `SUPABASE_ANON_KEY` / `VITE_SUPABASE_ANON_KEY`
   - `service_role` key (⚠️ secreta, nunca la expongas al frontend) →
     `SUPABASE_SERVICE_ROLE_KEY`
4. Andá a **Authentication → URL Configuration** y agregá
   `http://localhost:3000` en **Redirect URLs** (y `http://localhost:3000`
   también como **Site URL** si está vacío). Cuando despliegues a
   producción, agregá ahí también tu dominio real.
5. Todavía **no actives el provider de Google** — primero necesitás crear
   las credenciales OAuth en Google Cloud (paso siguiente), porque Supabase
   te va a pedir un Client ID/Secret de Google y a su vez te da a vos una
   **Redirect URI propia** que hay que pegar en Google Cloud. Andá anotando
   esa URL: **Authentication → Providers → Google** (todavía sin guardar)
   te muestra algo como:
   ```
   https://<tu-project-ref>.supabase.co/auth/v1/callback
   ```
   Copiala, la necesitás en el paso 2.3.

---

### 2. Google Cloud Console (OAuth + Drive/Docs API)

Esto habilita que, al loguearte con Google en la app, Supabase también te
pida permiso para leer/escribir en tu Drive/Docs y Calendar — así el
backend puede leer el documento MAESTRO en tu nombre.

1. Entrá a [console.cloud.google.com](https://console.cloud.google.com) →
   creá un proyecto nuevo (o usá uno existente).
2. **APIs & Services → Library**: buscá y **habilitá** estas dos APIs:
   - `Google Docs API`
   - `Google Drive API`
3. **APIs & Services → OAuth consent screen**:
   - Tipo de usuario: **External** (a menos que tengas Google Workspace).
   - Completá nombre de la app, email de soporte y de contacto.
   - En **Scopes**, agregá manualmente estos scopes (son los que pide el
     frontend al loguearse, en `frontend/src/lib/supabase.ts`):
     - `https://www.googleapis.com/auth/documents.readonly`
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/drive.file`
     - `https://www.googleapis.com/auth/calendar.events`
   - En **Test users**, agregá tu propia cuenta de Google (mientras la app
     esté en modo "Testing" solo esas cuentas van a poder loguearse).
4. **APIs & Services → Credentials → Create Credentials → OAuth client
   ID**:
   - Tipo de aplicación: **Web application**.
   - En **Authorized redirect URIs**, pegá la Redirect URI que copiaste de
     Supabase en el paso 1.5 (`https://<tu-project-ref>.supabase.co/auth/v1/callback`).
   - Creá y copiá el **Client ID** y **Client Secret**.
5. Volvé a Supabase → **Authentication → Providers → Google**, activalo,
   pegá el Client ID/Secret, y guardá.
6. **Compartir los documentos**: como el backend lee el documento MAESTRO
   y las guías con tu propio permiso de Google (no con una cuenta de
   servicio, salvo que configures la alternativa de abajo), asegurate de
   que esos Google Docs sean accesibles por la cuenta con la que vas a
   loguearte (si ya sos el dueño, no hace falta hacer nada extra).

   **Alternativa sin depender de tu sesión** (útil para que el cron
   semanal pueda leer el documento aunque no tengas la app abierta): creá
   una **Service Account** en el mismo proyecto de Google Cloud (**IAM &
   Admin → Service Accounts → Create Service Account**), generale una
   clave JSON (**Keys → Add Key → JSON**), y:
   - `GOOGLE_SERVICE_ACCOUNT_EMAIL` = el email `...@...iam.gserviceaccount.com` del JSON.
   - `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` = el campo `private_key` del JSON
     completo (incluye los `-----BEGIN PRIVATE KEY-----`; si lo pegás en
     una sola línea en `.env`, dejá los `\n` literales, el backend los
     convierte automáticamente).
   - Compartí (botón "Compartir" en Google Drive) el documento MAESTRO y
     las guías secundarias con ese email de service account (con
     permiso de lectura alcanza).

---

### 3. Canva (opcional, pero es la integración de diseño)

Sin esto, el paso "Diseño" del flujo semanal muestra un aviso para
conectar Canva pero el resto de la app funciona igual.

1. Entrá a [canva.com/developers](https://www.canva.com/developers/) →
   **Create an app** (tipo "Integration").
2. En la configuración de la app, agregá como **Redirect URI**:
   ```
   http://localhost:5000/api/canva/oauth/callback
   ```
   (cuando despliegues a producción, agregá también la URL real de tu
   backend con el mismo path).
3. Copiá el **Client ID** y **Client Secret** → `CANVA_CLIENT_ID` /
   `CANVA_CLIENT_SECRET` en `backend/.env`.
4. Diseñá (o adaptá) una **Brand Template** en Canva siguiendo la Guía de
   Diseño Canva del documento MAESTRO, con dos campos de texto con estos
   nombres exactos (son los que autocompleta el backend en
   `backend/src/routes/canva.ts`):
   - `title`
   - `hook`
5. Conseguí el **ID de esa brand template**: abrila en Canva, el ID está en
   la URL (`https://www.canva.com/design/<ESTE-ES-EL-ID>/...`) o usando el
   endpoint de listado de la Connect API. Copialo a
   `CANVA_BRAND_TEMPLATE_ID`.
6. La conexión OAuth de Canva **se hace desde la app** (no acá): una vez
   arrancado el proyecto, andá a **Ajustes → Conectar con Canva** logueado
   con tu usuario.

---

### 4. Anthropic (Claude — propuestas, captions e insights con IA)

1. Entrá a [console.anthropic.com](https://console.anthropic.com) → **API
   Keys → Create Key**.
2. Copiá la key a `ANTHROPIC_API_KEY` en `backend/.env`.
3. Opcional: `ANTHROPIC_MODEL` si querés forzar un modelo distinto al
   default (`claude-sonnet-5`).

Sin esta key la app arranca igual, pero "Generar 5 propuestas", "Sugerir
con IA" en Captions y los insights automáticos de Análisis van a devolver
un error explicando que falta configurarla.

---

### 5. Notificaciones push (las alarmas del flujo semanal)

Generá un par de claves VAPID (solo una vez, valen para siempre):

```bash
npx web-push generate-vapid-keys
```

Vas a obtener algo así:

```
=======================================
Public Key:
BN4Gv...
Private Key:
8f3k...
=======================================
```

- `Public Key` → `VAPID_PUBLIC_KEY` en `backend/.env` **y**
  `VITE_VAPID_PUBLIC_KEY` en `frontend/.env` (el mismo valor en los dos).
- `Private Key` → `VAPID_PRIVATE_KEY` en `backend/.env` (solo ahí, nunca en
  el frontend).
- `VAPID_SUBJECT` ya viene con un `mailto:` de ejemplo, cambialo por tu
  email real si querés (Google/Chrome lo usa para contactarte si tu
  servidor de push tiene problemas).

Sin esto configurado, las alarmas semanales se siguen "disparando" en el
backend (mirá los logs del servidor) pero no llegan como notificación real
al navegador/celular.

---

### 6. Completar los archivos `.env`

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Abrí ambos archivos y completá los valores juntados en los pasos 1 a 5.
Referencia rápida de qué va en cada uno:

**`backend/.env`**

| Variable | De dónde sale |
|---|---|
| `PORT` | Dejalo en `5000` salvo que lo necesites distinto |
| `FRONTEND_URL` | `http://localhost:3000` en local |
| `SUPABASE_URL` | Paso 1.3 |
| `SUPABASE_ANON_KEY` | Paso 1.3 |
| `SUPABASE_SERVICE_ROLE_KEY` | Paso 1.3 (secreta) |
| `ANTHROPIC_API_KEY` / `ANTHROPIC_MODEL` | Paso 4 |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `_PRIVATE_KEY` | Paso 2.6 (opcional) |
| `MASTER_DOC_FILE_ID` | Ya viene precargado con el fileId del documento MAESTRO real |
| `CANVA_CLIENT_ID` / `_SECRET` / `_REDIRECT_URI` / `_BRAND_TEMPLATE_ID` | Paso 3 |
| `VAPID_PUBLIC_KEY` / `_PRIVATE_KEY` / `_SUBJECT` | Paso 5 |
| `TOKEN_ENCRYPTION_KEY` | Cualquier string aleatorio largo (ej. `openssl rand -base64 32`) — encripta los tokens de Canva guardados en la base |

**`frontend/.env`**

| Variable | De dónde sale |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Mismos valores que en el backend (paso 1.3) |
| `VITE_API_URL` | `http://localhost:5000` en local |
| `VITE_VAPID_PUBLIC_KEY` | Paso 5 (la pública, la misma que en el backend) |

---

### 7. Correr en local

```bash
npm run dev
```

Esto levanta **backend y frontend en paralelo**. También podés correrlos
por separado en dos terminales:

```bash
npm run dev:backend    # http://localhost:5000
npm run dev:frontend   # http://localhost:3000
```

### 8. Verificar que todo esté conectado

1. Abrí `http://localhost:5000/api/health` — debería responder
   `{"ok": true, "features": {...}}`. Revisá el objeto `features`: te dice
   si detectó las keys de Claude, Canva, Push y la service account de
   Google. Si alguna está en `false`, revisá el `.env` correspondiente.
2. Abrí `http://localhost:3000` → **Entrar con Google** → aceptá los
   permisos de Drive/Calendar que pide el consentimiento (son los scopes
   del paso 2.3).
3. En el Dashboard, tocá **Generar 5 propuestas**. Si falla con "No se
   pudo leer el documento MAESTRO", revisá que (a) el login te haya dado
   permiso de Drive y (b) el documento esté compartido con tu cuenta o con
   la service account.
4. En **Ajustes**, probá **Conectar con Canva** y **Activar
   notificaciones** para terminar de verificar esas dos integraciones.

---

## El flujo semanal

1. **Lunes 8:30** — alarma push, se generan (o revisan) 5 propuestas con
   Claude a partir del documento MAESTRO + rendimiento reciente.
2. **Dashboard** — aceptás/rechazás propuestas, "Iniciar Grabación" crea los
   reels de la semana.
3. **Flujo obligatorio de 4 pasos** (bloqueado en orden, con auto-guardado):
   Grabación (guión + checklist + timer) → Captions (copy + hashtags,
   sugeridos por IA) → Diseño (autofill + export en Canva) → Programación
   (checklist de Metricool).
4. **Cerrar semana** en Análisis: cargás métricas por reel, Claude genera
   insights (qué funcionó / qué no / recomendación), y al cerrar sumás
   racha + badges.

---

## Gamificación

- **Racha visual**: banner arriba del Dashboard con "🔥 N semanas seguidas"
  y una barra de progreso hacia la próxima semana.
- **Indicador de paso**: "Paso X/4" siempre visible en el sidebar/header
  mientras dura el flujo obligatorio.
- **8 badges desbloqueables** (`frontend/src/lib/badges.ts` /
  `backend/src/lib/badges.ts`), evaluados al cerrar cada semana:

  | Badge | Condición |
  |---|---|
  | ⚡ Productor Rápido | Flujo completo en menos de 4h 45min |
  | 🚀 Viralidad | Un reel supera las 3,000 views |
  | 🧠 Neurobiología Master | 10 reels de la categoría Neurobiología |
  | 💬 Comentarista | Un reel supera los 50 comentarios |
  | 🔥 Streak 4 Semanas | 4 semanas seguidas completando el flujo |
  | 🎬 Director | 10 reels producidos en total |
  | 🔮 Visionario | 3 reels de la categoría Transformacional |
  | 👑 Leyenda | Los 7 badges anteriores desbloqueados |

- **Celebración post-semana**: al cerrar la semana en Análisis se abre una
  pantalla con confetti + sonido (sintetizado con Web Audio, sin archivos
  de audio) + los badges nuevos + los totales de la semana.
- **Sistema anti-escape**: pasos bloqueados en orden (`FlowGuard`, con
  aviso amarillo si intentás saltear), auto-guardado cada 10 segundos en
  Captions, e indicador de paso siempre visible.

---

## Solución de problemas

- **"No se pudo leer el documento de Google Drive"** — el `provider_token`
  de Google vence después de un rato (típicamente 1 hora). Andá a
  **Ajustes → Reconectar Google** para renovarlo, o configurá la service
  account (paso 2.6) para que no dependa de tu sesión.
- **Error de Canva al conectar / al generar diseño** — verificá que el
  `CANVA_REDIRECT_URI` en `backend/.env` sea *exactamente* igual (mismo
  protocolo, host y puerto) al que configuraste en canva.com/developers.
- **Las notificaciones no llegan** — confirmá que `VITE_VAPID_PUBLIC_KEY`
  (frontend) y `VAPID_PUBLIC_KEY` (backend) sean la misma clave, que el
  navegador tenga permiso de notificaciones para `localhost:3000`, y que
  el Service Worker se haya registrado (`chrome://serviceworker-internals`
  o el panel Application → Service Workers en DevTools).
- **CORS / "Failed to fetch" desde el frontend** — revisá que
  `FRONTEND_URL` en `backend/.env` coincida con la URL real desde la que
  abrís el frontend.
- **`ANTHROPIC_API_KEY no está configurada`** — es un error esperado si
  todavía no completaste el paso 4; el resto de la app sigue funcionando.

## Notas

- Todas las integraciones externas (Claude, Canva, Push, Drive) degradan
  con mensajes claros si falta configurarlas — la app arranca igual.
- El esquema de Supabase usa Row Level Security: cada fila queda atada al
  usuario que la creó (`auth.uid()`), pensado para un solo operador pero
  seguro si en el futuro se suma más gente.
