import cron from "node-cron";
import webpush from "web-push";
import { env, features } from "../lib/env.js";
import { supabaseAdmin } from "../lib/supabase.js";

if (features.push) {
  webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey!, env.vapidPrivateKey!);
}

async function notifyAllUsers(payload: { title: string; body: string; url?: string }) {
  if (!features.push) {
    console.log(`[alarma] (push deshabilitado) ${payload.title}: ${payload.body}`);
    return;
  }
  const { data: subs } = await supabaseAdmin.from("push_subscriptions").select("subscription");
  await Promise.all(
    (subs ?? []).map(async ({ subscription }) => {
      try {
        await webpush.sendNotification(subscription, JSON.stringify(payload));
      } catch (err) {
        console.error("Push falló para una suscripción:", (err as Error).message);
      }
    })
  );
}

/**
 * Registra las alarmas semanales del flujo de producción. Todas las horas
 * son horario local del servidor — ajustá TZ si hace falta (ej. en Vercel
 * cron / systemd: `TZ=America/Argentina/Buenos_Aires`).
 */
export function startScheduler() {
  // Lunes 8:30 — sesión de producción semanal
  cron.schedule("30 8 * * 1", () =>
    notifyAllUsers({
      title: "🧠 CaninaMente — Sesión de Producción Semanal",
      body: "Tengo 5 propuestas listas para esta semana. ¿Empezamos?",
      url: "/",
    })
  );

  // Miércoles 12:00 — recordatorio si todavía no grabó
  cron.schedule("0 12 * * 3", async () => {
    const weekStart = mondayOfCurrentWeek();
    const { data: cycles } = await supabaseAdmin
      .from("weekly_cycles")
      .select("id, flow_step")
      .eq("week_start", weekStart)
      .lt("flow_step", 1);
    if (cycles?.length) {
      await notifyAllUsers({
        title: "📹 CaninaMente",
        body: "Recuerdo: esta semana hay que grabar. ¿Necesitás ayuda?",
        url: "/grabacion",
      });
    }
  });

  // Jueves 18:00 — monitorear publicación
  cron.schedule("0 18 * * 4", () =>
    notifyAllUsers({
      title: "📊 CaninaMente",
      body: "Hoy se publica un Reel. Monitoreá el engagement en las próximas horas.",
      url: "/analisis",
    })
  );

  // Viernes 15:00 — feedback de la semana
  cron.schedule("0 15 * * 5", () =>
    notifyAllUsers({
      title: "✅ CaninaMente — ¿Cómo fue esta semana?",
      body: "Es momento de revisar resultados y dejar tu feedback.",
      url: "/analisis",
    })
  );

  // Domingo 18:00 — preview de la semana próxima
  cron.schedule("0 18 * * 0", () =>
    notifyAllUsers({
      title: "🚀 CaninaMente",
      body: "La semana que viene viene fuerte. Análisis de esta semana y propuestas nuevas ya disponibles.",
      url: "/",
    })
  );

  console.log("⏰ Alarmas semanales registradas (Lun 8:30, Mié 12:00, Jue 18:00, Vie 15:00, Dom 18:00).");
}

function mondayOfCurrentWeek(): string {
  const date = new Date();
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);
  return date.toISOString().slice(0, 10);
}
