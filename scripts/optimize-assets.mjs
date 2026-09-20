import { mkdir, readdir, stat } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const rootDir = path.resolve(process.cwd());
const sourceDir = path.join(rootDir, "src/assets");
const outputDir = path.join(sourceDir, "optimized");

const names = [
  "hero-student",
  "gallery-visa",
  "gallery-campus",
  "gallery-dorm-room",
  "gallery-airport",
];

const responsiveWidths = [480, 768, 1200, 1600];
const formats = [
  { format: "avif", quality: 62 },
  { format: "webp", quality: 72 },
];

async function ensureSourceExists(filePath) {
  try {
    const stats = await stat(filePath);
    return stats.isFile();
  } catch {
    return false;
  }
}

async function main() {
  await mkdir(outputDir, { recursive: true });

  const files = await readdir(sourceDir);
  const existing = new Set(files);

  for (const name of names) {
    const sourceFile = path.join(sourceDir, `${name}.webp`);
    if (!(await ensureSourceExists(sourceFile))) {
      console.warn(`Skipping ${name}: source asset not found at ${sourceFile}`);
      continue;
    }

    for (const width of responsiveWidths) {
      for (const { format, quality } of formats) {
        const target = path.join(outputDir, `${name}-${width}.${format}`);

        const exists = existing.has(path.basename(target));
        if (exists) {
          continue;
        }

        await sharp(sourceFile)
          .resize({ width, withoutEnlargement: true, fit: "cover" })
          .toFormat(format, { quality, effort: 5 })
          .toFile(target);
      }
    }

    const fallback = path.join(outputDir, `${name}-1600.webp`);
    await sharp(sourceFile)
      .resize({ width: 1600, withoutEnlargement: true, fit: "cover" })
      .toFormat("webp", { quality: 72, effort: 5 })
      .toFile(fallback);
  }

  console.log(`Optimized assets written to ${outputDir}`);
}

await main();
