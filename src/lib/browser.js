import { chromium } from 'playwright';
import { existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import TurndownService from 'turndown';

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// Playwright v1.45+ prefers chrome-headless-shell, but falls back to chrome.exe.
// We detect the available executable so the CLI works even if headless-shell wasn't downloaded.
function resolveExecutablePath() {
  // Use forward slashes — works on both Windows Node.js and bash on Windows
  const home = homedir().replace(/\\/g, '/');
  const base = `${home}/AppData/Local/ms-playwright`;
  const candidates = [
    `${base}/chromium_headless_shell-1208/chrome-headless-shell-win64/chrome-headless-shell.exe`,
    `${base}/chromium-1208/chrome-win64/chrome.exe`,
  ];
  for (const p of candidates) {
    if (existsSync(p)) return p;
  }
  return undefined; // let Playwright decide (non-Windows or system install)
}

export const EXECUTABLE_PATH = resolveExecutablePath();

/**
 * Opens a browser, runs fn(page), then closes it.
 */
export async function withPage(fn, opts = {}) {
  const { headless = true, timeout = 30000 } = opts;
  const launchOpts = { headless };
  if (EXECUTABLE_PATH) launchOpts.executablePath = EXECUTABLE_PATH;
  const browser = await chromium.launch(launchOpts);
  const context = await browser.newContext({ userAgent: USER_AGENT });
  const page = await context.newPage();
  page.setDefaultTimeout(timeout);
  try {
    return await fn(page);
  } finally {
    await browser.close();
  }
}

/**
 * Navigate to url and extract content in requested formats.
 * formats: 'markdown' | 'html' | 'json'
 */
export async function extractContent(page, url, formats = ['markdown'], waitFor) {
  await page.goto(url, { waitUntil: 'networkidle' });
  if (waitFor) await page.waitForSelector(waitFor, { timeout: 15000 });

  const html = await page.content();
  const title = await page.title();
  const finalUrl = page.url();

  const result = {
    url: finalUrl,
    title,
    timestamp: new Date().toISOString(),
  };

  if (formats.includes('html')) {
    result.html = html;
  }

  if (formats.includes('markdown')) {
    const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });
    const bodyHtml = await page.$eval('body', el => el.innerHTML).catch(() => html);
    result.markdown = td.turndown(bodyHtml);
  }

  if (formats.includes('json')) {
    result.structured = await page.evaluate(() => ({
      title: document.title,
      description: document.querySelector('meta[name="description"]')?.content ?? '',
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(h => ({
        level: h.tagName.toLowerCase(),
        text: h.textContent.trim(),
      })),
      links: [...document.querySelectorAll('a[href]')].map(a => ({
        text: a.textContent.trim().slice(0, 100),
        href: a.href,
      })),
      images: [...document.querySelectorAll('img')].map(img => ({
        src: img.src,
        alt: img.alt,
      })),
    }));
  }

  return result;
}

/**
 * Convert parsed URL to same-domain absolute URL, or null if external.
 */
export function sameDomainUrl(href, base) {
  try {
    const url = new URL(href, base);
    const baseHost = new URL(base).hostname;
    if (url.hostname !== baseHost) return null;
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}
