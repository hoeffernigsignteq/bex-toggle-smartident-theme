import { mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT_DIR = process.cwd();
const SOURCE_DIR = path.join(ROOT_DIR, 'assets', 'icons');
const OUTPUT_DIR = path.join(ROOT_DIR, 'public', 'icon');
const ICON_SIZES = [16, 32, 48, 96, 128];

const variants = [
  {
    sourceFile: 'toolbar-off.svg',
    outputName: (size) => `${size}.png`,
  },
  {
    sourceFile: 'toolbar-on.svg',
    outputName: (size) => `on-${size}.png`,
  },
  {
    sourceFile: 'toolbar-na.svg',
    outputName: (size) => `na-${size}.png`,
  },
];

await mkdir(OUTPUT_DIR, { recursive: true });

for (const variant of variants) {
  const svgPath = path.join(SOURCE_DIR, variant.sourceFile);
  const svgBuffer = await readFile(svgPath);

  for (const size of ICON_SIZES) {
    const outputPath = path.join(OUTPUT_DIR, variant.outputName(size));
    await sharp(svgBuffer).resize(size, size).png({ compressionLevel: 9 }).toFile(outputPath);
  }
}

console.log(`Generated icon assets in ${OUTPUT_DIR}`);
