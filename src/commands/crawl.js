import { PlaywrightCrawler, Configuration, log as crawleeLog } from 'crawlee';
import TurndownService from 'turndown';
import chalk from 'chalk';
import ora from 'ora';
import { tmpdir } from 'os';
import { join } from 'path';
import { printResults, saveOutput } from '../lib/output.js';
import { EXECUTABLE_PATH } from '../lib/browser.js';

crawleeLog.setLevel(crawleeLog.LEVELS.ERROR);

export async function crawlCommand(url, opts) {
  const {
    depth = 2,
    maxPages = 10,
    formats = ['markdown'],
    output,
    include,
    exclude,
    headless = true,
    timeout = 30000,
  } = opts;

  const results = [];
  const spinner = ora(`Crawling ${chalk.cyan(url)} (depth ${depth}, max ${maxPages} pages)`).start();

  const storageDir = join(tmpdir(), `scrawl-${Date.now()}`);
  Configuration.getGlobalConfig().set('storageClientOptions', { localDataDirectory: storageDir });

  const td = new TurndownService({ headingStyle: 'atx', codeBlockStyle: 'fenced' });

  const includePatterns = include ? include.split(',').map(s => s.trim()) : [];
  const excludePatterns = exclude ? exclude.split(',').map(s => s.trim()) : [];

  const crawler = new PlaywrightCrawler({
    launchContext: { launchOptions: { headless, ...(EXECUTABLE_PATH && { executablePath: EXECUTABLE_PATH }) } },
    maxRequestsPerCrawl: maxPages,
    maxConcurrency: 3,
    requestHandlerTimeoutSecs: timeout / 1000,

    async requestHandler({ request, page, enqueueLinks }) {
      await page.waitForLoadState('networkidle').catch(() => {});

      const html = await page.content();
      const title = await page.title();
      const result = { url: request.url, title, timestamp: new Date().toISOString() };

      if (formats.includes('html')) result.html = html;
      if (formats.includes('markdown')) {
        const bodyHtml = await page.$eval('body', el => el.innerHTML).catch(() => html);
        result.markdown = td.turndown(bodyHtml);
      }
      if (formats.includes('json')) {
        result.structured = await page.evaluate(() => ({
          title: document.title,
          headings: [...document.querySelectorAll('h1,h2,h3')].map(h => ({
            level: h.tagName.toLowerCase(),
            text: h.textContent.trim(),
          })),
          links: [...document.querySelectorAll('a[href]')].map(a => ({
            text: a.textContent.trim().slice(0, 100),
            href: a.href,
          })),
        }));
      }

      results.push(result);
      spinner.text = `Crawling… ${results.length} page(s) collected`;

      await enqueueLinks({
        strategy: 'same-domain',
        transformRequestFunction(req) {
          if (includePatterns.length && !includePatterns.some(p => req.url.includes(p))) return false;
          if (excludePatterns.some(p => req.url.includes(p))) return false;
          return req;
        },
      });
    },

    failedRequestHandler({ request }) {
      spinner.text = `Failed: ${request.url}`;
    },
  });

  try {
    await crawler.run([url]);
    spinner.succeed(`${chalk.green(`Done — ${results.length} page(s) crawled`)}`);

    if (output) {
      saveOutput(results, output);
    } else {
      printResults(results, formats);
    }
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
