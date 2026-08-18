import { join } from 'path';
import ora from 'ora';
import chalk from 'chalk';
import { withPage } from '../lib/browser.js';

export async function screenshotCommand(url, opts) {
  const {
    output,
    fullPage = true,
    format = 'png',
    selector,
    headless = true,
    timeout = 30000,
  } = opts;

  const defaultFile = `screenshot-${Date.now()}.${format}`;
  const outPath = output ?? defaultFile;

  const spinner = ora(`Taking screenshot of ${chalk.cyan(url)}`).start();

  try {
    await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle' });

      if (selector) {
        const el = await page.waitForSelector(selector);
        await el.screenshot({ path: outPath, type: format });
      } else {
        await page.screenshot({ path: outPath, fullPage, type: format });
      }
    }, { headless, timeout });

    spinner.succeed(chalk.green(`Screenshot saved → ${outPath}`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
