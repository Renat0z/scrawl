import { parseStringPromise } from 'xml2js';
import ora from 'ora';
import chalk from 'chalk';
import { saveOutput } from '../lib/output.js';

async function fetchSitemap(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${url}`);
  return res.text();
}

async function parseSitemapUrls(xml) {
  const parsed = await parseStringPromise(xml);
  const urls = [];

  // urlset (standard sitemap)
  if (parsed.urlset?.url) {
    for (const u of parsed.urlset.url) {
      urls.push({ loc: u.loc?.[0], lastmod: u.lastmod?.[0], priority: u.priority?.[0] });
    }
  }

  // sitemapindex (sitemap of sitemaps)
  if (parsed.sitemapindex?.sitemap) {
    for (const s of parsed.sitemapindex.sitemap) {
      const childUrl = s.loc?.[0];
      if (childUrl) {
        const childXml = await fetchSitemap(childUrl);
        const childUrls = await parseSitemapUrls(childXml);
        urls.push(...childUrls);
      }
    }
  }

  return urls;
}

export async function sitemapCommand(url, opts) {
  const { output } = opts;
  const spinner = ora(`Fetching sitemap for ${chalk.cyan(url)}`).start();

  try {
    // Try common sitemap locations
    const candidates = [
      url.endsWith('/') ? `${url}sitemap.xml` : `${url}/sitemap.xml`,
      url.endsWith('/') ? `${url}sitemap_index.xml` : `${url}/sitemap_index.xml`,
    ];

    let xml = null;
    for (const candidate of candidates) {
      try {
        xml = await fetchSitemap(candidate);
        spinner.text = `Parsing ${candidate}`;
        break;
      } catch {
        continue;
      }
    }

    if (!xml) throw new Error('No sitemap found. Tried sitemap.xml and sitemap_index.xml');

    const urls = await parseSitemapUrls(xml);
    spinner.succeed(chalk.green(`Done — ${urls.length} URL(s) in sitemap`));

    if (output) {
      saveOutput(urls, output);
    } else {
      for (const u of urls) {
        const parts = [u.loc];
        if (u.lastmod) parts.push(chalk.dim(`[${u.lastmod}]`));
        if (u.priority) parts.push(chalk.dim(`p:${u.priority}`));
        console.log(parts.join('  '));
      }
    }
  } catch (err) {
    spinner.fail(chalk.red(err.message));
    process.exit(1);
  }
}
