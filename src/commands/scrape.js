import ora from 'ora';
import chalk from 'chalk';
import { withPage, extractContent } from '../lib/browser.js';
import { printResult, saveOutput } from '../lib/output.js';

export async function scrapeCommand(url, opts) {
  const { formats = ['markdown'], output, waitFor, headless = true, timeout = 30000 } = opts;
  const spinner = ora(`Scraping ${chalk.cyan(url)}`).start();

  try {
    const result = await withPage(
      page => extractContent(page, url, formats, waitFor),
      { headless, timeout }
    );
    spinner.succeed(`${chalk.green(result.title || url)}`);

    if (output) {
      saveOutput(result, output);
    } else {
      printResult(result, formats);
    }
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
