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

## Configuración

### 1. Supabase

1. Creá un proyecto en [supabase.com](https://supabase.com).
2. Corré `supabase/migrations/0001_init.sql` en el SQL Editor.
3. **Authentication → Providers → Google**: activá el provider con tu
   Client ID/Secret de Google Cloud (OAuth consent screen con scopes de
   Drive/Docs/Calendar habilitados — ver más abajo).
4. **Authentication → URL Configuration**: agregá `http://localhost:3000`
   como Redirect URL (y tu dominio de producción cuando despliegues).

### 2. Google Cloud (para Drive/Docs vía OAuth de Supabase)

1. Creá un proyecto en [console.cloud.google.com](https://console.cloud.google.com).
2. Habilitá **Google Docs API** y **Google Drive API**.
3. Creá credenciales OAuth 2.0 (tipo "Web application"). Usá el Client
   ID/Secret en el provider de Google de Supabase (paso anterior).
4. Compartí el documento MAESTRO (y las guías secundarias) con la cuenta de
   Google que vas a usar para loguearte — o usá una service account (ver
   `backend/.env.example`) si preferís no depender de la sesión del usuario.

### 3. Canva (opcional pero recomendado)

1. Creá una app en [canva.com/developers](https://www.canva.com/developers/).
2. Redirect URI: `http://localhost:5000/api/canva/oauth/callback`.
3. Copiá Client ID/Secret a `backend/.env`.
4. Publicá (o dejá en draft para vos mismo) una **Brand Template** con los
   campos de texto `title` y `hook` (según la Guía de Diseño Canva) y copiá
   su ID a `CANVA_BRAND_TEMPLATE_ID`.

### 4. Anthropic (Claude)

`ANTHROPIC_API_KEY` desde [console.anthropic.com](https://console.anthropic.com).
Sin esta key, la app sigue funcionando pero sin generación automática de
propuestas/captions/insights.

### 5. Notificaciones push (alarmas semanales)

```bash
npx web-push generate-vapid-keys
```

Copiá las claves a `backend/.env` (`VAPID_PUBLIC_KEY` / `VAPID_PRIVATE_KEY`)
y `frontend/.env` (`VITE_VAPID_PUBLIC_KEY`, mismo valor público).

### 6. Variables de entorno

```bash
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env
```

Completá ambos con los valores de arriba.

## Correr en local

```bash
npm install
npm run dev
```

- Frontend: http://localhost:3000
- Backend: http://localhost:5000/api/health

`npm run dev` levanta ambos workspaces en paralelo. También podés correrlos
por separado con `npm run dev:frontend` / `npm run dev:backend`.

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

## Notas

- El token de Google (`provider_token` de Supabase) vence después de un
  rato; si Drive deja de leer el documento MAESTRO, usá "Reconectar Google"
  en Ajustes.
- Todas las integraciones externas (Claude, Canva, Push, Drive) degradan
  con mensajes claros si falta configurarlas — la app arranca igual.
