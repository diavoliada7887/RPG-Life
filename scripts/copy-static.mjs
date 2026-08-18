import { cp, copyFile, mkdir } from 'node:fs/promises';

await mkdir('dist', { recursive: true });
await copyFile('manifest.webmanifest', 'dist/manifest.webmanifest');
await copyFile('icon.svg', 'dist/icon.svg');
await copyFile('sw.js', 'dist/sw.js');
await cp('assets', 'dist/assets', { recursive: true, force: true });
console.log('Copied PWA shell and runtime assets');
