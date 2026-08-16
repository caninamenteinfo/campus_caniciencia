import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import axios from "axios";
import { Storage } from "@google-cloud/storage";
import { env, features } from "./env.js";

let gcsClient: Storage | null = null;
function getGcsBucket() {
  gcsClient ??= new Storage({
    projectId: env.googleProjectId,
    credentials: {
      client_email: env.googleServiceAccountEmail,
      private_key: env.googleServiceAccountPrivateKey,
    },
  });
  return gcsClient.bucket(env.gcsBucket!);
}

function objectKey(reelId: string): string {
  return `${env.gcsPrefix}${reelId}.mp4`;
}

function localPath(reelId: string): string {
  return path.join(env.mediaStorageDir, `${reelId}.mp4`);
}

/**
 * Descarga el MP4 exportado por Canva (URL temporal, expira) y lo persiste
 * en GCS (si está configurado) o en disco local — para que el video no
 * dependa de un link que Canva puede vencer. Devuelve la ruta interna que
 * usa `GET /api/media/reels/:id` para servirlo, ya sea desde disco o GCS.
 */
export async function persistExportedVideo(reelId: string, canvaExportUrl: string): Promise<void> {
  const response = await axios.get<NodeJS.ReadableStream>(canvaExportUrl, { responseType: "stream" });

  if (features.gcs) {
    const file = getGcsBucket().file(objectKey(reelId));
    await new Promise<void>((resolve, reject) => {
      response.data
        .pipe(file.createWriteStream({ contentType: "video/mp4", resumable: false }))
        .on("error", reject)
        .on("finish", resolve);
    });
    return;
  }

  await fsp.mkdir(env.mediaStorageDir, { recursive: true });
  const dest = localPath(reelId);
  await new Promise<void>((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(dest))
      .on("error", reject)
      .on("finish", resolve);
  });
}

export interface MediaStream {
  stream: NodeJS.ReadableStream;
  contentLength?: number;
  contentType: string;
}

/** Abre el video guardado (GCS o local) para servirlo, opcionalmente por rango de bytes (scrubbing). */
export async function openStoredVideo(
  reelId: string,
  range?: { start: number; end?: number }
): Promise<MediaStream> {
  if (features.gcs) {
    const file = getGcsBucket().file(objectKey(reelId));
    const [metadata] = await file.getMetadata();
    const size = Number(metadata.size ?? 0);
    const stream = file.createReadStream(range ? { start: range.start, end: range.end ?? size - 1 } : {});
    return { stream, contentLength: range ? (range.end ?? size - 1) - range.start + 1 : size, contentType: "video/mp4" };
  }

  const dest = localPath(reelId);
  const stat = await fsp.stat(dest);
  const stream = fs.createReadStream(dest, range ? { start: range.start, end: range.end ?? stat.size - 1 } : undefined);
  return {
    stream,
    contentLength: range ? (range.end ?? stat.size - 1) - range.start + 1 : stat.size,
    contentType: "video/mp4",
  };
}

export async function hasStoredVideo(reelId: string): Promise<boolean> {
  try {
    if (features.gcs) {
      const [exists] = await getGcsBucket().file(objectKey(reelId)).exists();
      return exists;
    }
    await fsp.access(localPath(reelId));
    return true;
  } catch {
    return false;
  }
}
