import { spawnSync } from 'node:child_process';
import { cp, mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const builder = fileURLToPath(new URL('./build-pages.mjs', import.meta.url));
const result = spawnSync(process.execPath, [builder, '--api-base', 'https://suixing-chufa-cloud.wenzodz.chatgpt.site'], { cwd: project, stdio: 'inherit' });
if (result.error) throw result.error;
if (result.status !== 0) process.exit(result.status || 1);
const directory = new URL('../public/web/', import.meta.url);
await mkdir(directory, { recursive: true });
await cp(new URL('../dist-pages/', import.meta.url), directory, { recursive: true });
