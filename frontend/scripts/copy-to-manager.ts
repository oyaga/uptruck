// Copia o build estático do Next.js (out/) para backend/manager/dist/.
// Roda com Bun (`bun scripts/copy-to-manager.ts`) — usa apenas APIs nativas
// do runtime (fs, path) sem dependências externas.

import { existsSync, mkdirSync, readdirSync, rmSync, statSync, copyFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(import.meta.dir, "..");
const src = join(root, "out");
const dst = resolve(root, "..", "backend", "manager", "dist");

if (!existsSync(src)) {
  console.error(`[export:copy] '${src}' não existe — rode 'next build' primeiro.`);
  process.exit(1);
}

// Limpa destino, preservando .gitkeep
if (existsSync(dst)) {
  for (const name of readdirSync(dst)) {
    if (name === ".gitkeep") continue;
    rmSync(join(dst, name), { recursive: true, force: true });
  }
} else {
  mkdirSync(dst, { recursive: true });
}

let copied = 0;
function walk(from: string, to: string) {
  mkdirSync(to, { recursive: true });
  for (const name of readdirSync(from)) {
    const f = join(from, name);
    const t = join(to, name);
    const st = statSync(f);
    if (st.isDirectory()) walk(f, t);
    else {
      copyFileSync(f, t);
      copied++;
    }
  }
}

walk(src, dst);
console.log(`[export:copy] ${copied} arquivo(s) copiados para ${dst}`);
