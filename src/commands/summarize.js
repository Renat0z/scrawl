import ora from 'ora';
import chalk from 'chalk';
import { withPage, extractContent } from '../lib/browser.js';
import { summarize } from '../lib/ai.js';
import { saveOutput } from '../lib/output.js';

export async function summarizeCommand(url, opts) {
  const { model, length = 'medium', output, headless = true, timeout = 30000 } = opts;

  const spinner = ora(`Scraping ${chalk.cyan(url)}`).start();

  try {
    const result = await withPage(
      p => extractContent(p, url, ['markdown']),
      { headless, timeout }
    );

    spinner.text = 'Summarizing with Groq…';
    const summary = await summarize(result.markdown ?? '', length, model);
    spinner.succeed(chalk.green(result.title || url));

    console.log(`\n${summary}`);

    if (output) {
      saveOutput({ url, title: result.title, summary, timestamp: new Date().toISOString() }, output);
    }
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
