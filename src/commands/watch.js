import chalk from 'chalk';
import { withPage, extractContent } from '../lib/browser.js';
import { parseInterval, hash } from '../lib/utils.js';
import { saveOutput } from '../lib/output.js';

export async function watchCommand(url, opts) {
  const {
    interval = '5m',
    selector,
    output,
    headless = true,
    timeout = 30000,
  } = opts;

  let intervalMs;
  try {
    intervalMs = parseInterval(interval);
  } catch (err) {
    console.error(chalk.red(err.message));
    process.exit(1);
  }

  console.log(chalk.cyan(`Watching ${url} every ${interval}`));
  console.log(chalk.dim('Press Ctrl+C to stop\n'));

  let lastHash = null;
  const changes = [];

  async function check() {
    const ts = new Date().toISOString();
    try {
      let content;
      if (selector) {
        content = await withPage(async (page) => {
          await page.goto(url, { waitUntil: 'networkidle' });
          return page.$eval(selector, el => el.textContent.trim()).catch(() => '');
        }, { headless, timeout });
      } else {
        const result = await withPage(p => extractContent(p, url, ['markdown']), { headless, timeout });
        content = result.markdown ?? '';
      }

      const currentHash = hash(content);

      if (lastHash === null) {
        lastHash = currentHash;
        console.log(chalk.dim(`[${ts}] Initial snapshot taken`));
        return;
      }

      if (currentHash !== lastHash) {
        lastHash = currentHash;
        const entry = { url, timestamp: ts, changed: true };
        changes.push(entry);
        console.log(chalk.yellow(`[${ts}] ⚡ Change detected!`));
        if (output) saveOutput(changes, output);
      } else {
        console.log(chalk.dim(`[${ts}] No change`));
      }
    } catch (err) {
      console.log(chalk.red(`[${ts}] Error: ${err.message}`));
    }
  }

  await check();
  const timer = setInterval(check, intervalMs);

  process.on('SIGINT', () => {
    clearInterval(timer);
    console.log(chalk.cyan(`\nStopped. ${changes.length} change(s) detected.`));
    process.exit(0);
  });
}
