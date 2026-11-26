// Copies the web app (repo root) into native/www for Capacitor.
// The service worker and the update banner are only for the website; the store apps update through the stores.
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..');
const out = join(here, '..', 'www');

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
for (const item of ['index.html', 'privacy.html', 'manifest.webmanifest', 'css', 'js', 'images', 'icons', 'videos']) {
  if (existsSync(join(root, item))) cpSync(join(root, item), join(out, item), { recursive: true });
}
// load the native bridge before the app starts
const indexPath = join(out, 'index.html');
let html = readFileSync(indexPath, 'utf8');
html = html.replace('<script src="js/main.js"></script>', '<script src="js/native.js"></script>\n  <script src="js/main.js"></script>');
writeFileSync(indexPath, html);
console.log('Web app copied to native/www');
