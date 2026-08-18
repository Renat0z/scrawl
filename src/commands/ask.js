import ora from 'ora';
import chalk from 'chalk';
import { withPage, extractContent } from '../lib/browser.js';
import { ask } from '../lib/ai.js';
import { saveOutput } from '../lib/output.js';

export async function askCommand(url, question, opts) {
  const { model, output, headless = true, timeout = 30000 } = opts;

  const spinner = ora(`Scraping ${chalk.cyan(url)}`).start();

  try {
    const page_result = await withPage(
      p => extractContent(p, url, ['markdown']),
      { headless, timeout }
    );

    spinner.text = 'Asking Groq…';
    const answer = await ask(page_result.markdown ?? '', question, model);
    spinner.succeed(chalk.green('Done'));

    console.log(chalk.bold.cyan(`\nQ: ${question}`));
    console.log(`\n${answer}`);

    if (output) {
      saveOutput({ url, question, answer, timestamp: new Date().toISOString() }, output);
    }
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
