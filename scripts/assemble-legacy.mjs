import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const files = [
  'app.js',
  'calorie-bank.js',
  'rpg-simple-bank.js',
  'gameplay-v5.js', 'gameplay-v6.js', 'gameplay-v7.js', 'gameplay-v8.js',
  'gameplay-v10.js', 'gameplay-v11.js', 'gameplay-v12.js', 'gameplay-v13.js',
  'gameplay-v14.js', 'gameplay-v15.js', 'gameplay-v16.js', 'gameplay-v17.js',
  'gameplay-v18.js', 'gameplay-v19.js', 'gameplay-v20.js', 'gameplay-v22.js',
  'gameplay-v23.js', 'gameplay-v24.js', 'gameplay-v25.js', 'gameplay-v27.js',
  'gameplay-v28.js', 'gameplay-v29.js', 'gameplay-v30.js', 'gameplay-v31.js',
  'gameplay-v32.js', 'gameplay-v33.js', 'gameplay-v34.js', 'gameplay-v35.js',
  'gameplay-v36.js', 'gameplay-v37.js', 'gameplay-v38.js', 'gameplay-v39.js',
  'cloud-sync-v2.js',
  'cloud-recovery.js'
];

const chunks = [];
for (const file of files) {
  const source = await readFile(resolve(root, file), 'utf8');
  chunks.push(`\n/* ---- ${file} ---- */\n${source}\n`);
}

const out = resolve(root, 'src/generated/legacy-app.js');
await mkdir(dirname(out), { recursive: true });
await writeFile(out, chunks.join('\n'), 'utf8');
console.log(`Assembled ${files.length} legacy files -> src/generated/legacy-app.js`);
