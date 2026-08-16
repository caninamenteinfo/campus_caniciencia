import "dotenv/config";

function optional(name: string): string | undefined {
  const value = process.env[name];
  return value && value.length > 0 ? value : undefined;
}

function required(name: string): string {
  const value = optional(name);
  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}. Revisá backend/.env`);
  }
  return value;
}

export const env = {
  port: Number(optional("PORT") ?? 5000),
  frontendUrl: optional("FRONTEND_URL") ?? "http://localhost:3000",

  supabaseUrl: required("SUPABASE_URL"),
  supabaseAnonKey: required("SUPABASE_ANON_KEY"),
  supabaseServiceRoleKey: required("SUPABASE_SERVICE_ROLE_KEY"),

  anthropicApiKey: optional("ANTHROPIC_API_KEY"),
  anthropicModel: optional("ANTHROPIC_MODEL") ?? "claude-sonnet-5",

  googleServiceAccountEmail: optional("GOOGLE_SERVICE_ACCOUNT_EMAIL"),
  googleServiceAccountPrivateKey: optional("GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY")?.replace(
    /\\n/g,
    "\n"
  ),
  masterDocFileId: optional("MASTER_DOC_FILE_ID"),

  canvaClientId: optional("CANVA_CLIENT_ID"),
  canvaClientSecret: optional("CANVA_CLIENT_SECRET"),
  canvaRedirectUri: optional("CANVA_REDIRECT_URI") ?? "http://localhost:5000/api/canva/oauth/callback",
  // Template por defecto/fallback cuando la categoría no matchea ninguno de los 5 de abajo.
  canvaBrandTemplateId: optional("CANVA_BRAND_TEMPLATE_ID"),
  canvaTemplates: {
    neurobiologia: optional("CANVA_TEMPLATE_NEUROBIOLOGIA"),
    transformacional: optional("CANVA_TEMPLATE_TRANSFORMACIONAL"),
    desmitificacion: optional("CANVA_TEMPLATE_DESMITIFICACION"),
    carrusel: optional("CANVA_TEMPLATE_CARRUSEL"),
    evento: optional("CANVA_TEMPLATE_EVENTO"),
  },

  vapidPublicKey: optional("VAPID_PUBLIC_KEY"),
  vapidPrivateKey: optional("VAPID_PRIVATE_KEY"),
  vapidSubject: optional("VAPID_SUBJECT") ?? "mailto:caninamente.info@gmail.com",

  tokenEncryptionKey: optional("TOKEN_ENCRYPTION_KEY") ?? "dev-only-insecure-key-change-me!!",

  // Almacenamiento de los MP4 exportados de Canva: por defecto disco local
  // (server efímero — sirve para desarrollo/single-instance), o Google
  // Cloud Storage si configurás GCS_BUCKET (reutiliza las credenciales de
  // la service account de Google ya definidas arriba).
  mediaStorageDir: optional("MEDIA_STORAGE_DIR") ?? "/tmp/caninamente-media",
  gcsBucket: optional("GCS_BUCKET"),
  gcsPrefix: optional("GCS_PREFIX") ?? "reels/",
  googleProjectId: optional("GOOGLE_PROJECT_ID"),
};

export const features = {
  claude: Boolean(env.anthropicApiKey),
  canva: Boolean(env.canvaClientId && env.canvaClientSecret),
  push: Boolean(env.vapidPublicKey && env.vapidPrivateKey),
  driveServiceAccount: Boolean(env.googleServiceAccountEmail && env.googleServiceAccountPrivateKey),
  gcs: Boolean(env.gcsBucket && env.googleServiceAccountEmail && env.googleServiceAccountPrivateKey),
};
