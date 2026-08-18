import ora from 'ora';
import chalk from 'chalk';
import { withPage } from '../lib/browser.js';
import { saveOutput } from '../lib/output.js';

export async function interceptCommand(url, opts) {
  const { type = 'all', filter, output, headless = true, timeout = 30000 } = opts;

  const spinner = ora(`Loading ${chalk.cyan(url)} and intercepting network calls`).start();
  const captured = [];

  try {
    await withPage(async (page) => {
      // Capture responses
      page.on('response', async (response) => {
        const reqUrl = response.url();
        const method = response.request().method();
        const resourceType = response.request().resourceType();
        const status = response.status();
        const contentType = response.headers()['content-type'] ?? '';

        // Filter by type
        if (type === 'xhr' && resourceType !== 'xhr') return;
        if (type === 'fetch' && resourceType !== 'fetch') return;
        if (type === 'api' && !['xhr', 'fetch'].includes(resourceType)) return;

        // Filter by URL pattern
        if (filter && !reqUrl.includes(filter)) return;

        const entry = {
          url: reqUrl,
          method,
          status,
          contentType,
          resourceType,
          timestamp: new Date().toISOString(),
        };

        // Try to parse JSON body
        if (contentType.includes('application/json')) {
          try {
            entry.body = await response.json();
          } catch {
            entry.body = null;
          }
        }

        captured.push(entry);
        spinner.text = `Intercepted ${captured.length} call(s)…`;
      });

      await page.goto(url, { waitUntil: 'networkidle' });
      // Wait a bit more for late XHR calls
      await page.waitForTimeout(2000);
    }, { headless, timeout });

    spinner.succeed(chalk.green(`Done — ${captured.length} network call(s) captured`));

    if (output) {
      saveOutput(captured, output);
    } else {
      for (const c of captured) {
        const color = c.status >= 400 ? chalk.red : chalk.green;
        console.log(`${color(c.status)} ${chalk.bold(c.method)} ${c.url}`);
        if (c.body) console.log(chalk.dim(JSON.stringify(c.body).slice(0, 200)));
      }
    }
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
