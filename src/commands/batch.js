import pLimit from 'p-limit';
import ora from 'ora';
import chalk from 'chalk';
import { withPage, extractContent } from '../lib/browser.js';
import { printResults, saveOutput } from '../lib/output.js';
import { readLines, isUrl } from '../lib/utils.js';

export async function batchCommand(file, opts) {
  const { formats = ['markdown'], output, concurrency = 3, headless = true, timeout = 30000 } = opts;

  let urls;
  try {
    urls = readLines(file).filter(isUrl);
  } catch {
    console.error(chalk.red(`Cannot read file: ${file}`));
    process.exit(1);
  }

  if (!urls.length) {
    console.error(chalk.red('No valid URLs found in file.'));
    process.exit(1);
  }

  console.error(chalk.cyan(`Processing ${urls.length} URLs with concurrency ${concurrency}…\n`));

  const limit = pLimit(concurrency);
  const results = [];
  let done = 0;

  const spinner = ora(`0 / ${urls.length}`).start();

  await Promise.all(
    urls.map(url =>
      limit(async () => {
        try {
          const result = await withPage(
            page => extractContent(page, url, formats),
            { headless, timeout }
          );
          results.push(result);
        } catch (err) {
          results.push({ url, error: err.message, timestamp: new Date().toISOString() });
        } finally {
          done++;
          spinner.text = `${done} / ${urls.length}  ${chalk.dim(url)}`;
        }
      })
    )
  );

  const ok = results.filter(r => !r.error).length;
  const fail = results.filter(r => r.error).length;
  spinner.succeed(chalk.green(`Done — ${ok} ok, ${fail} failed`));

  if (output) {
    saveOutput(results, output);
  } else {
    printResults(results.filter(r => !r.error), formats);
    if (fail) {
      console.error(chalk.red(`\nFailed URLs:`));
      results.filter(r => r.error).forEach(r => console.error(`  ${r.url} — ${r.error}`));
    }
  }
}
