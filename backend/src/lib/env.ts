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
  canvaBrandTemplateId: optional("CANVA_BRAND_TEMPLATE_ID"),

  vapidPublicKey: optional("VAPID_PUBLIC_KEY"),
  vapidPrivateKey: optional("VAPID_PRIVATE_KEY"),
  vapidSubject: optional("VAPID_SUBJECT") ?? "mailto:caninamente.info@gmail.com",

  tokenEncryptionKey: optional("TOKEN_ENCRYPTION_KEY") ?? "dev-only-insecure-key-change-me!!",
};

export const features = {
  claude: Boolean(env.anthropicApiKey),
  canva: Boolean(env.canvaClientId && env.canvaClientSecret),
  push: Boolean(env.vapidPublicKey && env.vapidPrivateKey),
  driveServiceAccount: Boolean(env.googleServiceAccountEmail && env.googleServiceAccountPrivateKey),
};
