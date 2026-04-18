import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { existsSync } from 'node:fs';

// Resolve apps/web/.env.local from import.meta.url so the agent loads env
// regardless of cwd (pnpm --filter, Docker, standalone tsx).
export function resolveEnvPath(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  let dir = here;
  for (let i = 0; i < 8; i++) {
    const candidate = resolve(dir, 'apps/web/.env.local');
    if (existsSync(candidate)) return candidate;
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  // Best-effort fallback — dotenv silently skips if the path doesn't exist
  // but logs a warn when DOTENV_CONFIG_DEBUG=1.
  return resolve(here, '../../../apps/web/.env.local');
}
