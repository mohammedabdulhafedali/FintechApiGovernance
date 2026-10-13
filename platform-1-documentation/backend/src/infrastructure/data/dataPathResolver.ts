import fsSync from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

export function resolveDataPath(filename: string): string {
  const currentDir = path.dirname(fileURLToPath(import.meta.url));

  const candidates = [
    path.resolve(currentDir, `../../../src/infrastructure/data/${filename}`),
    path.resolve(process.cwd(), `platform-1-documentation/backend/src/infrastructure/data/${filename}`),
    path.resolve(process.cwd(), `src/infrastructure/data/${filename}`),
    path.resolve(currentDir, `../data/${filename}`)
  ];

  for (const p of candidates) {
    if (fsSync.existsSync(p)) {
      return p;
    }
  }

  // If none exists, choose the candidates[0] or candidates[1] and ensure directory exists
  const chosen = candidates[0];
  const dir = path.dirname(chosen);
  if (!fsSync.existsSync(dir)) {
    fsSync.mkdirSync(dir, { recursive: true });
  }
  return chosen;
}
