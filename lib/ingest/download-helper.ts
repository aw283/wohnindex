/**
 * Download-Helper mit lokalem Cache (.cache/).
 * Liefert lokalen Pfad + HTTP Last-Modified als datenstand.
 */
import * as fs from "fs";
import * as path from "path";
import * as https from "https";
import * as http from "http";

const CACHE_DIR = path.resolve(process.cwd(), ".cache");

if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

export interface DownloadResult {
  localPath: string;
  /** HTTP Last-Modified Header als Date-String, oder null wenn nicht geliefert */
  lastModified: string | null;
}

function fetchWithRedirect(
  url: string,
  dest: string
): Promise<{ lastModified: string | null }> {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith("https") ? https : http;
    const file = fs.createWriteStream(dest);

    const req = mod.get(url, (res) => {
      // Redirect folgen
      if (
        res.statusCode &&
        res.statusCode >= 300 &&
        res.statusCode < 400 &&
        res.headers.location
      ) {
        file.close();
        fs.unlinkSync(dest);
        fetchWithRedirect(res.headers.location, dest)
          .then(resolve)
          .catch(reject);
        return;
      }

      if (!res.statusCode || res.statusCode >= 400) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${url}`));
        return;
      }

      const lastModified = res.headers["last-modified"] ?? null;
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve({ lastModified });
      });
    });

    req.on("error", (err) => {
      file.close();
      if (fs.existsSync(dest)) fs.unlinkSync(dest);
      reject(err);
    });
  });
}

/**
 * Lädt eine Datei herunter und cached sie lokal.
 * Bei erneutem Aufruf wird die gecachte Version genutzt (kein Re-Download).
 *
 * @param url   Vollständige URL (https)
 * @param alias Dateiname im .cache/-Verzeichnis (z.B. "Haeuserpreise2024.ods")
 * @param force Erzwinge Re-Download auch bei vorhandenem Cache
 */
export async function downloadFile(
  url: string,
  alias: string,
  force = false
): Promise<DownloadResult> {
  const localPath = path.join(CACHE_DIR, alias);

  if (!force && fs.existsSync(localPath)) {
    console.log(`[cache] ${alias}`);
    return { localPath, lastModified: null };
  }

  console.log(`[download] ${alias} <- ${url}`);
  const { lastModified } = await fetchWithRedirect(url, localPath);
  console.log(`[done] ${alias} (last-modified: ${lastModified ?? "unbekannt"})`);
  return { localPath, lastModified };
}
