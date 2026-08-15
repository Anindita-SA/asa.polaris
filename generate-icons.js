import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir);
}

const svgString = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='#030712'/><polygon points='32,4 37,24 60,32 37,40 32,60 27,40 4,32 27,24' fill='#F59E0B'/><circle cx='32' cy='32' r='6' fill='#030712'/></svg>`;

const generate = async (size, filename) => {
  await sharp(Buffer.from(svgString))
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, filename));
  console.log(`Generated ${filename}`);
};

const run = async () => {
  await generate(192, 'pwa-192x192.png');
  await generate(512, 'pwa-512x512.png');
  await generate(180, 'apple-touch-icon.png');
};

run();
