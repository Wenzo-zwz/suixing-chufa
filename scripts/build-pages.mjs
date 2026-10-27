import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
import { DESTINATIONS, ORIGINS, THEMES, PROVINCES, PRESETS, DISCLAIMER } from '../prototype/catalog.mjs';

const project = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(project, 'prototype');
const defaultOutput = path.join(project, 'dist-pages');
const staticFiles = [
  'index.html', 'styles.css', 'app.mjs', 'render.mjs', 'client-model.mjs',
  'game-interactions.mjs', 'gesture-model.mjs',
  'candidate-core.mjs', 'local-travel.mjs',
  'assets/brand/suixing-chufa-avatar-v3-plane-rider.png'
];

function apiOrigin(value) {
  try {
    const url = new URL(value);
    if (url.protocol === 'https:' && !url.username && !url.password && url.pathname === '/' && !url.search && !url.hash) return url.origin;
  } catch {}
  throw new Error('Provide a public HTTPS API origin with --api-base (no credentials, path, query or fragment).');
}

export async function buildPages({ apiBase, outputDir = defaultOutput } = {}) {
  const origin = apiOrigin(apiBase);
  const output = path.resolve(outputDir);
  // Only dist-pages may be replaced inside the project; external exports are explicit targets.
  const inside = relative => !relative || (relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative));
  if (output === path.parse(output).root || inside(path.relative(output, project)) || (inside(path.relative(project, output)) && output !== defaultOutput)) {
    throw new Error('The Pages output directory must be separate from project sources.');
  }
  // Read every approved asset before replacing the previous export.
  const files = await Promise.all(staticFiles.map(async name => [name, await readFile(path.join(source, name))]));
  const catalog = JSON.stringify({ destinations: DESTINATIONS, origins: ORIGINS, themes: THEMES, provinces: PROVINCES, presets: PRESETS, disclaimer: DISCLAIMER });
  const release = createHash('sha256').update(catalog).update(origin);
  for (const [, bytes] of files) release.update(bytes);
  const version = release.digest('hex').slice(0, 12);
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const [name, bytes] of files) {
    const target = path.join(output, name);
    await mkdir(path.dirname(target), { recursive: true });
    const content = name === 'index.html'
      ? bytes.toString('utf8').replace(/((?:src|href)="\.\/(?:app\.mjs|styles\.css))"/g, `$1?v=${version}"`)
      : name.endsWith('.mjs')
        ? bytes.toString('utf8').replace(/(\bfrom\s+['"])(\.\/[^'"]+\.mjs)(['"])/g, `$1$2?v=${version}$3`)
        : bytes;
    await writeFile(target, content);
  }
  await writeFile(path.join(output, 'runtime-config.mjs'), `export default ${JSON.stringify({ apiBase: origin })};\n`);
  await writeFile(path.join(output, 'catalog.json'), catalog);
  await writeFile(path.join(output, '.nojekyll'), '');
  return output;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    let apiBase, outputDir;
    for (let index = 0; index < args.length; index += 2) {
      if (!['--api-base', '--out-dir'].includes(args[index]) || !args[index + 1]) throw new Error('Provide a public HTTPS API origin with --api-base; optional --out-dir selects the export directory.');
      if (args[index] === '--api-base') apiBase = args[index + 1];
      else outputDir = args[index + 1];
    }
    const output = await buildPages({ apiBase, outputDir });
    console.log(`Pages static files exported to ${output}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
