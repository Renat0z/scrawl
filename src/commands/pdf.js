import ora from 'ora';
import chalk from 'chalk';
import { withPage } from '../lib/browser.js';

export async function pdfCommand(url, opts) {
  const {
    output,
    format: pageFormat = 'A4',
    landscape = false,
    noBackground = false,
    timeout = 30000,
  } = opts;

  const outPath = output ?? `page-${Date.now()}.pdf`;
  const spinner = ora(`Generating PDF of ${chalk.cyan(url)}`).start();

  try {
    // PDF requires headless: true (Playwright requirement)
    await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.pdf({
        path: outPath,
        format: pageFormat,
        landscape,
        printBackground: !noBackground,
        margin: { top: '20px', bottom: '20px', left: '20px', right: '20px' },
      });
    }, { headless: true, timeout });

    spinner.succeed(chalk.green(`PDF saved → ${outPath}`));
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
