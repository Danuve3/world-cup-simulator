/**
 * generate-player-photos.mjs
 *
 * Generates a bank of realistic football player portrait photos using
 * Hugging Face Inference API (FLUX.1-schnell) — 100% FREE.
 *
 * Requirements:
 *   1. Create a free account at https://huggingface.co
 *   2. Generate a token at https://huggingface.co/settings/tokens
 *      (type "Read" is enough)
 *
 * Usage:
 *   HF_TOKEN=your_token node scripts/generate-player-photos.mjs
 *
 * Output:
 *   public/players/{category}/{index}.jpg
 *   public/players/manifest.json
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = path.join(__dirname, '../public/players');

// ─── Model config ─────────────────────────────────────────────────────────────
const HF_MODEL = 'black-forest-labs/FLUX.1-schnell';
const HF_API_URL = `https://router.huggingface.co/hf-inference/models/${HF_MODEL}`;
// Keep concurrency low to respect free tier rate limits
const CONCURRENCY = 2;
// Delay between requests (ms) to avoid hitting rate limits
const REQUEST_DELAY = 1500;

// ─── Photo categories ──────────────────────────────────────────────────────────
const CATEGORIES = [
  {
    id: 'euro_latin',
    count: 50,
    ethnicity: 'Southern European man, French, Spanish, Italian or Portuguese appearance, olive to medium skin tone, dark or brown hair',
  },
  {
    id: 'euro_north',
    count: 40,
    ethnicity: 'Northern or Western European man, British, Scandinavian, Dutch or Irish appearance, fair skin, blond, red or brown hair',
  },
  {
    id: 'euro_east',
    count: 45,
    ethnicity: 'Eastern European man, Polish, Serbian, Croatian, Czech, Romanian or Ukrainian appearance, medium fair skin, dark or brown hair',
  },
  {
    id: 'euro_caucasus',
    count: 20,
    ethnicity: 'Caucasian or Southeastern European man, Turkish, Georgian, Greek or Armenian appearance, olive to tan skin, dark hair',
  },
  {
    id: 'south_america',
    count: 55,
    ethnicity: 'South American man, Brazilian, Argentine or Colombian appearance, mixed Latino heritage, tan to medium-dark skin, dark hair',
  },
  {
    id: 'africa_dark',
    count: 50,
    ethnicity: 'West or Central African man, Nigerian, Ghanaian, Senegalese or Cameroonian appearance, dark brown to very dark skin, short black hair',
  },
  {
    id: 'africa_north',
    count: 30,
    ethnicity: 'North African or Arab man, Moroccan, Algerian, Egyptian or Tunisian appearance, medium olive to tan skin, dark hair',
  },
  {
    id: 'middle_east',
    count: 30,
    ethnicity: 'Middle Eastern man, Saudi Arabian, Iranian or Qatari appearance, medium to tan skin, dark hair, strong facial features',
  },
  {
    id: 'east_asia',
    count: 35,
    ethnicity: 'East or Southeast Asian man, Japanese, Korean or Chinese appearance, light to medium skin, straight black hair',
  },
  {
    id: 'mixed_americas',
    count: 30,
    ethnicity: 'North or Central American man of mixed heritage, Mexican, American or Caribbean appearance, medium to tan skin, varied features',
  },
];

// Age groups distribution
const AGE_GROUPS = [
  { label: 'young', range: '19 to 22', weight: 0.30 },
  { label: 'mid',   range: '24 to 29', weight: 0.50 },
  { label: 'vet',   range: '32 to 37', weight: 0.20 },
];

const PROMPT_TEMPLATE = `Close-up portrait of a {ethnicity}, {age} years old, professional football player, athletic build, wearing a plain dark navy blue training polo shirt, confident relaxed expression, natural soft lighting, blurred football stadium stands bokeh background, photorealistic sports photography, sharp focus on face, high quality, hyperrealistic`;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function pickAgeGroup(seed) {
  const val = (seed % 100) / 100;
  let cumulative = 0;
  for (const ag of AGE_GROUPS) {
    cumulative += ag.weight;
    if (val <= cumulative) return ag;
  }
  return AGE_GROUPS[1];
}

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function runWithConcurrency(tasks, limit) {
  return new Promise((resolve, reject) => {
    const results = [];
    let index = 0;
    let active = 0;
    let done = 0;

    function next() {
      while (active < limit && index < tasks.length) {
        const i = index++;
        active++;
        tasks[i]()
          .then(r => { results[i] = r; })
          .catch(e => { results[i] = { error: e.message }; })
          .finally(() => {
            active--;
            done++;
            if (done === tasks.length) resolve(results);
            else next();
          });
      }
    }
    next();
  });
}

// ─── Hugging Face call ────────────────────────────────────────────────────────

async function generateOne(prompt, hfToken, retries = 3) {
  for (let attempt = 0; attempt < retries; attempt++) {
    if (attempt > 0) {
      // On retry, wait longer (model may be loading)
      await sleep(10000);
    }

    const res = await fetch(HF_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${hfToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          num_inference_steps: 4,
          guidance_scale: 0,
        },
      }),
    });

    // Model loading — HF returns 503 with estimated_time
    if (res.status === 503) {
      const data = await res.json().catch(() => ({}));
      const wait = Math.ceil((data.estimated_time ?? 20) * 1000);
      process.stdout.write(`  ⏳ model loading, waiting ${Math.ceil(wait / 1000)}s ... `);
      await sleep(wait);
      continue;
    }

    if (res.status === 429) {
      process.stdout.write(`  ⚠️  rate limited, waiting 30s ... `);
      await sleep(30000);
      continue;
    }

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HF API error ${res.status}: ${text}`);
    }

    // Response is raw image bytes
    const buf = await res.arrayBuffer();
    return Buffer.from(buf);
  }
  throw new Error(`Failed after ${retries} attempts`);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  const HF_TOKEN = process.env.HF_TOKEN;
  if (!HF_TOKEN) {
    console.error('❌  Missing HF_TOKEN environment variable');
    console.error('');
    console.error('   1. Create a free account at https://huggingface.co');
    console.error('   2. Get your token at https://huggingface.co/settings/tokens');
    console.error('   3. Run: HF_TOKEN=your_token node scripts/generate-player-photos.mjs');
    process.exit(1);
  }

  const totalImages = CATEGORIES.reduce((s, c) => s + c.count, 0);
  console.log(`\n🎨  World Cup Simulator — Player Photo Generator`);
  console.log(`📸  Model: ${HF_MODEL} (via Hugging Face — FREE)`);
  console.log(`🗂️   Categories: ${CATEGORIES.length}`);
  console.log(`🔢  Total images: ${totalImages}`);
  console.log(`⚡  Concurrency: ${CONCURRENCY} parallel requests\n`);

  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  let totalGenerated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;

  for (const category of CATEGORIES) {
    const catDir = path.join(OUTPUT_DIR, category.id);
    if (!fs.existsSync(catDir)) fs.mkdirSync(catDir);

    const tasks = [];
    for (let i = 0; i < category.count; i++) {
      const ag = pickAgeGroup(i * 7 + category.id.length);
      const filename = `${String(i).padStart(3, '0')}_${ag.label}.webp`;
      const filepath = path.join(catDir, filename);

      if (fs.existsSync(filepath)) {
        totalSkipped++;
        continue;
      }

      const prompt = PROMPT_TEMPLATE
        .replace('{ethnicity}', category.ethnicity)
        .replace('{age}', ag.range);

      tasks.push({ filename, filepath, prompt });
    }

    const missing = tasks.length;
    const existing = category.count - missing;
    console.log(`\n📁  [${category.id}]  ${existing} existing, ${missing} to generate`);
    if (missing === 0) continue;

    const fns = tasks.map(task => async () => {
      await sleep(REQUEST_DELAY);
      try {
        process.stdout.write(`  ⏳ ${task.filename} ... `);
        const imageBuffer = await generateOne(task.prompt, HF_TOKEN);
        await sharp(imageBuffer).resize(100, 100, { fit: 'cover' }).webp({ quality: 85 }).toFile(task.filepath);
        process.stdout.write(`✅\n`);
        totalGenerated++;
        return { ok: true };
      } catch (err) {
        process.stdout.write(`❌ ${err.message}\n`);
        totalErrors++;
        return { error: err.message };
      }
    });

    await runWithConcurrency(fns, CONCURRENCY);
  }

  console.log(`\n${'─'.repeat(50)}`);
  console.log(`✅  Generated: ${totalGenerated}`);
  console.log(`⏭️   Skipped:   ${totalSkipped}`);
  console.log(`❌  Errors:    ${totalErrors}`);

  // Generate manifest.json
  const manifest = {};
  for (const category of CATEGORIES) {
    const catDir = path.join(OUTPUT_DIR, category.id);
    if (!fs.existsSync(catDir)) continue;
    const files = fs.readdirSync(catDir)
      .filter(f => f.endsWith('.webp'))
      .sort()
      .map(f => `players/${category.id}/${f.replace('.jpg', '.webp')}`);
    manifest[category.id] = files;
  }
  fs.writeFileSync(path.join(OUTPUT_DIR, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`\n📋  Manifest saved → public/players/manifest.json`);
  console.log(`    Total photos in bank: ${Object.values(manifest).reduce((s, a) => s + a.length, 0)}`);
}

main().catch(err => {
  console.error('\n💥 Fatal error:', err.message);
  process.exit(1);
});
