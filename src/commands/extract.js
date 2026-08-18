import ora from 'ora';
import chalk from 'chalk';
import { withPage } from '../lib/browser.js';
import { saveOutput } from '../lib/output.js';

export async function extractCommand(url, opts) {
  const { selector, attr, multiple = false, output, headless = true, timeout = 30000 } = opts;

  if (!selector) {
    console.error(chalk.red('Error: --selector is required.'));
    process.exit(1);
  }

  const spinner = ora(`Extracting from ${chalk.cyan(url)}`).start();

  try {
    const result = await withPage(async (page) => {
      await page.goto(url, { waitUntil: 'networkidle' });

      const extracted = await page.evaluate(
        ({ sel, attribute, multi }) => {
          const els = multi ? [...document.querySelectorAll(sel)] : [document.querySelector(sel)].filter(Boolean);
          return els.map(el => {
            if (attribute === 'text') return el.textContent.trim();
            if (attribute === 'html') return el.innerHTML;
            if (attribute) return el.getAttribute(attribute);
            return el.textContent.trim();
          });
        },
        { sel: selector, attribute: attr, multi: multiple }
      );

      return {
        url: page.url(),
        selector,
        count: extracted.length,
        results: multiple ? extracted : extracted[0] ?? null,
        timestamp: new Date().toISOString(),
      };
    }, { headless, timeout });

    spinner.succeed(chalk.green(`Extracted ${result.count} match(es)`));

    if (output) {
      saveOutput(result, output);
    } else {
      if (Array.isArray(result.results)) {
        result.results.forEach((r, i) => console.log(`[${i + 1}] ${r}`));
      } else {
        console.log(result.results);
      }
    }
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
