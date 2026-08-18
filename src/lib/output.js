import { writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import chalk from 'chalk';

export function saveOutput(data, outputPath) {
  mkdirSync(dirname(outputPath) || '.', { recursive: true });
  const ext = outputPath.split('.').pop().toLowerCase();

  let content;
  if (ext === 'json') {
    content = JSON.stringify(data, null, 2);
  } else if (ext === 'md') {
    content = Array.isArray(data)
      ? data.map(r => `# ${r.url}\n\n${r.markdown ?? ''}`).join('\n\n---\n\n')
      : (data.markdown ?? JSON.stringify(data, null, 2));
  } else if (ext === 'html') {
    content = Array.isArray(data)
      ? data.map(r => r.html ?? '').join('\n\n')
      : (data.html ?? '');
  } else if (ext === 'csv') {
    content = toCSV(Array.isArray(data) ? data : [data]);
  } else {
    content = JSON.stringify(data, null, 2);
  }

  writeFileSync(outputPath, content, 'utf8');
  console.error(chalk.green(`\n✓ Saved → ${outputPath}`));
}

export function printResult(result, formats = ['markdown']) {
  if (formats.includes('markdown') && result.markdown) {
    console.log(result.markdown);
  } else if (formats.includes('html') && result.html) {
    console.log(result.html);
  } else if (formats.includes('json') && result.structured) {
    console.log(JSON.stringify(result.structured, null, 2));
  } else {
    console.log(JSON.stringify(result, null, 2));
  }
}

export function printResults(results, formats = ['markdown']) {
  for (const r of results) {
    console.log(chalk.bold.cyan(`\n${'─'.repeat(60)}`));
    console.log(chalk.bold(`${r.url}`));
    console.log(chalk.dim(r.title ?? ''));
    console.log(chalk.bold.cyan('─'.repeat(60)));
    printResult(r, formats);
  }
}

function toCSV(rows) {
  if (!rows.length) return '';
  const flatRows = rows.map(r => {
    const { structured, html, markdown, ...rest } = r;
    return rest;
  });
  const keys = [...new Set(flatRows.flatMap(Object.keys))];
  const header = keys.join(',');
  const lines = flatRows.map(row =>
    keys.map(k => JSON.stringify(row[k] ?? '')).join(',')
  );
  return [header, ...lines].join('\n');
}
