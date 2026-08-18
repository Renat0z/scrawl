import { createWriteStream, mkdirSync } from 'fs';
import { join, basename, extname } from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import ora from 'ora';
import chalk from 'chalk';
import { withPage } from '../lib/browser.js';
import { saveOutput } from '../lib/output.js';

const TYPE_SELECTORS = {
  images: 'img[src]',
  pdfs: 'a[href$=".pdf"], a[href*=".pdf?"]',
  videos: 'video[src], source[src], a[href$=".mp4"], a[href$=".webm"]',
  audio: 'audio[src], source[src], a[href$=".mp3"], a[href$=".wav"]',
  docs: 'a[href$=".docx"], a[href$=".xlsx"], a[href$=".pptx"], a[href$=".zip"]',
};

async function downloadFile(url, destDir) {
  const name = basename(new URL(url).pathname) || `asset-${Date.now()}${extname(url) || ''}`;
  const dest = join(destDir, name);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(dest));
  return dest;
}

export async function assetsCommand(url, opts) {
  const { types = 'images', outputDir = './assets', noDownload = false, output, headless = true, timeout = 30000 } = opts;

  const wantedTypes = types.split(',').map(t => t.trim());
  const spinner = ora(`Scanning assets on ${chalk.cyan(url)}`).start();

  try {
    const assetUrls = await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle' });

      const found = [];
      for (const type of wantedTypes) {
        const sel = TYPE_SELECTORS[type];
        if (!sel) continue;
        const urls = await page.evaluate((selector) => {
          return [...document.querySelectorAll(selector)].map(el => el.src || el.href).filter(Boolean);
        }, sel);
        found.push(...urls.map(u => ({ type, url: u })));
      }
      return found;
    }, { headless, timeout });

    if (!assetUrls.length) {
      spinner.warn(chalk.yellow('No assets found.'));
      return;
    }

    spinner.succeed(chalk.green(`Found ${assetUrls.length} asset(s)`));

    if (noDownload || output) {
      if (output) saveOutput(assetUrls, output);
      else assetUrls.forEach(a => console.log(`[${a.type}] ${a.url}`));
      return;
    }

    mkdirSync(outputDir, { recursive: true });
    console.log(chalk.cyan(`\nDownloading to ${outputDir}/\n`));

    let ok = 0;
    let fail = 0;
    for (const asset of assetUrls) {
      const dl = ora({ text: chalk.dim(asset.url), prefixText: '' }).start();
      try {
        const dest = await downloadFile(asset.url, outputDir);
        dl.succeed(`${chalk.green('✓')} ${basename(dest)}`);
        ok++;
      } catch (err) {
        dl.fail(`${chalk.red('✗')} ${asset.url} — ${err.message}`);
        fail++;
      }
    }

    console.log(chalk.green(`\n${ok} downloaded, ${fail} failed → ${outputDir}/`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
