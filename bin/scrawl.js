#!/usr/bin/env node
import { Command } from 'commander';
import { scrapeCommand } from '../src/commands/scrape.js';
import { crawlCommand } from '../src/commands/crawl.js';
import { mapCommand } from '../src/commands/map.js';
import { sitemapCommand } from '../src/commands/sitemap.js';
import { batchCommand } from '../src/commands/batch.js';
import { extractCommand } from '../src/commands/extract.js';
import { screenshotCommand } from '../src/commands/screenshot.js';
import { pdfCommand } from '../src/commands/pdf.js';
import { watchCommand } from '../src/commands/watch.js';
import { diffCommand } from '../src/commands/diff.js';
import { askCommand } from '../src/commands/ask.js';
import { summarizeCommand } from '../src/commands/summarize.js';
import { interceptCommand } from '../src/commands/intercept.js';
import { assetsCommand } from '../src/commands/assets.js';
import { normalizeUrl } from '../src/lib/utils.js';

const program = new Command();

program
  .name('scrawl')
  .description('Web scraping CLI with JS/SPA support and AI-powered extraction')
  .version('1.0.0');

// ── Shared options helpers ─────────────────────────────────────────────────

function addBrowserOpts(cmd) {
  return cmd
    .option('--no-headless', 'Show browser window (useful for debugging)')
    .option('--timeout <ms>', 'Navigation timeout in ms', v => parseInt(v), 30000);
}

function addFormatOpts(cmd) {
  return cmd
    .option('-f, --formats <list>', 'Output formats: markdown,html,json (comma-separated)', 'markdown')
    .option('-o, --output <file>', 'Save output to file (.json, .md, .html, .csv)');
}

function parseFormats(str) {
  return str.split(',').map(s => s.trim());
}

// ── scrape ─────────────────────────────────────────────────────────────────

const scrape = program.command('scrape <url>').description('Scrape a single page (renders JS)');
addFormatOpts(addBrowserOpts(scrape));
scrape
  .option('--wait-for <selector>', 'Wait for CSS selector before extracting')
  .action((url, opts) => scrapeCommand(normalizeUrl(url), { ...opts, formats: parseFormats(opts.formats) }));

// ── crawl ──────────────────────────────────────────────────────────────────

const crawl = program.command('crawl <url>').description('Crawl a full website (renders JS)');
addFormatOpts(addBrowserOpts(crawl));
crawl
  .option('-d, --depth <n>', 'Max crawl depth', v => parseInt(v), 2)
  .option('-p, --max-pages <n>', 'Max pages to crawl', v => parseInt(v), 10)
  .option('--include <patterns>', 'Only follow URLs containing these strings (comma-separated)')
  .option('--exclude <patterns>', 'Skip URLs containing these strings (comma-separated)')
  .action((url, opts) => crawlCommand(normalizeUrl(url), { ...opts, formats: parseFormats(opts.formats) }));

// ── map ────────────────────────────────────────────────────────────────────

const map = program.command('map <url>').description('Collect all URLs of a domain');
addBrowserOpts(map);
map
  .option('-d, --depth <n>', 'Max crawl depth', v => parseInt(v), 3)
  .option('-p, --max-pages <n>', 'Max pages to visit', v => parseInt(v), 100)
  .option('-o, --output <file>', 'Save URL list to file')
  .action((url, opts) => mapCommand(normalizeUrl(url), opts));

// ── sitemap ────────────────────────────────────────────────────────────────

program
  .command('sitemap <url>')
  .description('Parse sitemap.xml (supports sitemap index)')
  .option('-o, --output <file>', 'Save to file')
  .action((url, opts) => sitemapCommand(normalizeUrl(url), opts));

// ── batch ──────────────────────────────────────────────────────────────────

const batch = program.command('batch <file>').description('Scrape a list of URLs from a text file');
addFormatOpts(addBrowserOpts(batch));
batch
  .option('-c, --concurrency <n>', 'Parallel workers', v => parseInt(v), 3)
  .action((file, opts) => batchCommand(file, { ...opts, formats: parseFormats(opts.formats) }));

// ── extract ────────────────────────────────────────────────────────────────

const extract = program.command('extract <url>').description('Extract elements via CSS selector');
addBrowserOpts(extract);
extract
  .requiredOption('-s, --selector <css>', 'CSS selector to extract')
  .option('-a, --attr <name>', 'Attribute to extract (default: text content). Use "html" for innerHTML')
  .option('--multiple', 'Return all matches (default: first only)')
  .option('-o, --output <file>', 'Save to file')
  .action((url, opts) => extractCommand(normalizeUrl(url), opts));

// ── screenshot ─────────────────────────────────────────────────────────────

const screenshot = program.command('screenshot <url>').description('Take a full-page screenshot');
addBrowserOpts(screenshot);
screenshot
  .option('-o, --output <file>', 'Output file (default: screenshot-<ts>.png)')
  .option('--no-full-page', 'Capture viewport only')
  .option('--format <type>', 'png or jpeg', 'png')
  .option('-s, --selector <css>', 'Capture specific element')
  .action((url, opts) => screenshotCommand(normalizeUrl(url), opts));

// ── pdf ────────────────────────────────────────────────────────────────────

program
  .command('pdf <url>')
  .description('Export page as PDF')
  .option('-o, --output <file>', 'Output file (default: page-<ts>.pdf)')
  .option('--format <size>', 'Page format: A4, Letter, A3…', 'A4')
  .option('--landscape', 'Landscape orientation')
  .option('--no-background', 'Omit background graphics')
  .option('--timeout <ms>', 'Navigation timeout', v => parseInt(v), 30000)
  .action((url, opts) => pdfCommand(normalizeUrl(url), opts));

// ── watch ──────────────────────────────────────────────────────────────────

const watch = program.command('watch <url>').description('Monitor a URL for content changes');
addBrowserOpts(watch);
watch
  .option('-i, --interval <duration>', 'Check interval: 30s, 5m, 1h', '5m')
  .option('-s, --selector <css>', 'Watch specific element only')
  .option('-o, --output <file>', 'Append changes to file')
  .action((url, opts) => watchCommand(normalizeUrl(url), opts));

// ── diff ───────────────────────────────────────────────────────────────────

const diff = program.command('diff <url>').description('Compare current page with saved snapshot');
addBrowserOpts(diff);
diff
  .option('--since <file>', 'Path to a specific snapshot file')
  .option('-s, --selector <css>', 'Diff specific element only')
  .option('-o, --output <file>', 'Save diff to file')
  .action((url, opts) => diffCommand(normalizeUrl(url), opts));

// ── ask ────────────────────────────────────────────────────────────────────

const ask = program.command('ask <url> <question>').description('Ask a question about a page (uses Groq)');
addBrowserOpts(ask);
ask
  .option('--model <name>', 'Groq model', 'llama-3.1-8b-instant')
  .option('-o, --output <file>', 'Save answer to file')
  .action((url, question, opts) => askCommand(normalizeUrl(url), question, opts));

// ── summarize ──────────────────────────────────────────────────────────────

const summarize = program.command('summarize <url>').description('Summarize a page with Groq AI');
addBrowserOpts(summarize);
summarize
  .option('--model <name>', 'Groq model', 'llama-3.1-8b-instant')
  .option('--length <size>', 'short | medium | long', 'medium')
  .option('-o, --output <file>', 'Save summary to file')
  .action((url, opts) => summarizeCommand(normalizeUrl(url), opts));

// ── intercept ─────────────────────────────────────────────────────────────

const intercept = program.command('intercept <url>').description('Capture network API calls during page load');
addBrowserOpts(intercept);
intercept
  .option('--type <kind>', 'all | xhr | fetch | api', 'all')
  .option('--filter <pattern>', 'Only capture URLs matching this string')
  .option('-o, --output <file>', 'Save captured calls to file')
  .action((url, opts) => interceptCommand(normalizeUrl(url), opts));

// ── assets ─────────────────────────────────────────────────────────────────

const assets = program.command('assets <url>').description('Download assets from a page');
addBrowserOpts(assets);
assets
  .option('--types <list>', 'images,pdfs,videos,audio,docs (comma-separated)', 'images')
  .option('--output-dir <dir>', 'Download directory', './assets')
  .option('--no-download', 'List assets only, do not download')
  .option('-o, --output <file>', 'Save asset list to file')
  .action((url, opts) => assetsCommand(normalizeUrl(url), opts));

// ── Shorthand: scrawl <url> → crawl ───────────────────────────────────────

const KNOWN_COMMANDS = new Set([
  'scrape', 'crawl', 'map', 'sitemap', 'batch',
  'extract', 'screenshot', 'pdf', 'watch', 'diff',
  'ask', 'summarize', 'intercept', 'assets',
  '--help', '-h', '--version', '-V',
]);

const firstArg = process.argv[2];
if (firstArg && !KNOWN_COMMANDS.has(firstArg) && !firstArg.startsWith('-')) {
  process.argv.splice(2, 0, 'crawl');
}

program.parse();
