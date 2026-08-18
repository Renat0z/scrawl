import chalk from 'chalk';
import { withPage, extractContent } from '../lib/browser.js';
import { saveSnapshot, loadSnapshot, diffLines } from '../lib/utils.js';
import { saveOutput } from '../lib/output.js';

export async function diffCommand(url, opts) {
  const { since, selector, output, headless = true, timeout = 30000 } = opts;

  console.log(chalk.cyan(`Diffing ${url}`));

  try {
    // Load previous snapshot
    const snapshot = loadSnapshot(url, since);

    // Get current content
    let current;
    if (selector) {
      current = await withPage(async (page) => {
        await page.goto(url, { waitUntil: 'networkidle' });
        return page.$eval(selector, el => el.textContent.trim()).catch(() => '');
      }, { headless, timeout });
    } else {
      const result = await withPage(p => extractContent(p, url, ['markdown']), { headless, timeout });
      current = result.markdown ?? '';
    }

    if (!snapshot) {
      // No previous snapshot — save one now
      const file = saveSnapshot(url, { content: current });
      console.log(chalk.yellow(`No previous snapshot found. Saved new snapshot → ${file}`));
      console.log(chalk.dim('Run again to compare.'));
      return;
    }

    const { added, removed } = diffLines(snapshot.content ?? '', current);

    if (!added.length && !removed.length) {
      console.log(chalk.green('✓ No changes since last snapshot.'));
      console.log(chalk.dim(`  Snapshot from: ${snapshot.timestamp}`));
    } else {
      console.log(chalk.dim(`Compared against snapshot from: ${snapshot.timestamp}\n`));
      removed.forEach(l => console.log(chalk.red(`- ${l}`)));
      added.forEach(l => console.log(chalk.green(`+ ${l}`)));
      console.log(chalk.yellow(`\n${added.length} added, ${removed.length} removed lines`));
    }

    // Update snapshot
    saveSnapshot(url, { content: current });

    if (output) {
      saveOutput({ url, since: snapshot.timestamp, added, removed }, output);
    }
  } catch (err) {
    console.error(chalk.red(err.message));
    process.exit(1);
  }
}
