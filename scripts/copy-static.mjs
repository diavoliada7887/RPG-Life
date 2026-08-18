import { cp, copyFile, mkdir, readdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });

for (const entry of await readdir('.', { withFileTypes: true })) {
  if (!entry.isFile()) continue;
  if (!/\.(?:js|css)$/i.test(entry.name)) continue;
  await copyFile(entry.name, `dist/${entry.name}`);
}

await copyFile('manifest.webmanifest', 'dist/manifest.webmanifest');
await copyFile('icon.svg', 'dist/icon.svg');
await copyFile('sw.js', 'dist/sw.js');
await cp('assets', 'dist/assets', { recursive: true, force: true });
console.log('Copied legacy runtime and PWA assets');
