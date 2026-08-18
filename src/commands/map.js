import { PlaywrightCrawler, Configuration, log as crawleeLog } from 'crawlee';
import chalk from 'chalk';
import ora from 'ora';
import { tmpdir } from 'os';
import { join } from 'path';
import { saveOutput } from '../lib/output.js';
import { EXECUTABLE_PATH } from '../lib/browser.js';

crawleeLog.setLevel(crawleeLog.LEVELS.ERROR);

export async function mapCommand(url, opts) {
  const { depth = 3, maxPages = 100, output, headless = true } = opts;

  const urls = new Set();
  const spinner = ora(`Mapping ${chalk.cyan(url)}`).start();

  const storageDir = join(tmpdir(), `scrawl-${Date.now()}`);
  Configuration.getGlobalConfig().set('storageClientOptions', { localDataDirectory: storageDir });

  const crawler = new PlaywrightCrawler({
    launchContext: { launchOptions: { headless, ...(EXECUTABLE_PATH && { executablePath: EXECUTABLE_PATH }) } },
    maxRequestsPerCrawl: maxPages,
    maxConcurrency: 5,

    async requestHandler({ request, enqueueLinks }) {
      urls.add(request.url);
      spinner.text = `Mapping… ${urls.size} URL(s) found`;
      await enqueueLinks({ strategy: 'same-domain' });
    },

    failedRequestHandler() {},
  });

  try {
    await crawler.run([url]);
    spinner.succeed(chalk.green(`Done — ${urls.size} URL(s) mapped`));

    const list = [...urls].sort();

    if (output) {
      saveOutput(list, output);
    } else {
      list.forEach(u => console.log(u));
    }
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
