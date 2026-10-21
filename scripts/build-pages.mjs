import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const project = fileURLToPath(new URL('../', import.meta.url));
const source = path.join(project, 'prototype');
const defaultOutput = path.join(project, 'dist-pages');
const staticFiles = [
  'index.html', 'styles.css', 'app.mjs', 'render.mjs', 'client-model.mjs',
  'game-interactions.mjs', 'gesture-model.mjs',
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
  await rm(output, { recursive: true, force: true });
  await mkdir(output, { recursive: true });
  for (const [name, bytes] of files) {
    const target = path.join(output, name);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, bytes);
  }
  await writeFile(path.join(output, 'runtime-config.mjs'), `export default ${JSON.stringify({ apiBase: origin })};\n`);
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
