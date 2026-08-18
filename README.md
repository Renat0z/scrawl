# Scrawl

> Turn JavaScript-heavy websites into clean Markdown, structured data, screenshots, PDFs, and AI-ready answers—without building a scraper from scratch.

[![Node.js 18+](https://img.shields.io/badge/Node.js-18%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![Playwright](https://img.shields.io/badge/browser-Playwright-2EAD33?logo=playwright&logoColor=white)](https://playwright.dev/)
[![Groq](https://img.shields.io/badge/AI-Groq-F55036)](https://console.groq.com/)

Modern pages do not ship as finished HTML. They hydrate, fetch data after load, hide content behind interactions, and expose useful information through network calls. Traditional request-based scrapers often see an empty shell.

Scrawl launches a real Chromium browser, waits for the page to settle, and gives you one CLI for the whole workflow:

```bash
scrawl scrape "https://example.com" -o page.md
scrawl extract "https://example.com" -s ".price" --multiple
scrawl intercept "https://app.example.com" --type api -o calls.json
scrawl summarize "https://example.com/article"
```

No browser automation boilerplate. No one-off scripts for every output format. Just a URL and the result you need.

## What Scrawl can do

| Goal | Command | What you get |
|---|---|---|
| Read a rendered page | `scrape` | Markdown, HTML, or structured JSON |
| Explore a website | `crawl` | Content from multiple same-domain pages |
| Discover URLs | `map` | A sorted list of same-domain URLs |
| Read XML sitemaps | `sitemap` | URLs from a sitemap or nested sitemap index |
| Process a URL list | `batch` | Concurrent scraping with per-URL error isolation |
| Target page elements | `extract` | Text, HTML, or an attribute selected with CSS |
| Capture a visual | `screenshot` | Full-page, viewport, or element PNG/JPEG |
| Archive a page | `pdf` | A4, Letter, A3, or another Chromium PDF format |
| Detect changes | `watch` | Continuous content-change notifications |
| Compare snapshots | `diff` | Added and removed lines between page versions |
| Ask about a page | `ask` | A focused answer generated with Groq |
| Condense a page | `summarize` | A short, medium, or long AI summary |
| Inspect app traffic | `intercept` | XHR/fetch metadata and JSON response bodies |
| Collect files | `assets` | Images, PDFs, video, audio, or documents |

URLs without a command default to `crawl`, so this:

```bash
scrawl "https://docs.example.com" --depth 3 --max-pages 50
```

is shorthand for:

```bash
scrawl crawl "https://docs.example.com" --depth 3 --max-pages 50
```

## Why it feels different

- **It sees what users see.** Playwright renders client-side JavaScript and SPAs before extraction.
- **It follows the job, not just the page.** Scrape, crawl, query, monitor, archive, and download from the same interface.
- **It produces useful output immediately.** Print to the terminal or save as `.md`, `.html`, `.json`, and, where applicable, `.csv`.
- **It works well in pipelines.** Batch concurrency, include/exclude filters, selectors, and output files make commands composable.
- **AI is optional.** Every browser and extraction command works without an API key; only `ask` and `summarize` require Groq.

## Start in two minutes

### Requirements

- [Node.js](https://nodejs.org/) 18 or newer
- Chromium installed through Playwright
- A [Groq API key](https://console.groq.com/) only if you use `ask` or `summarize`

### Install from GitHub

```bash
git clone https://github.com/Renat0z/scrawl.git
cd scrawl
npm install
npx playwright install chromium
npm install -g .
```

Verify the installation:

```bash
scrawl --help
scrawl --version
```

Prefer not to install globally? Run the CLI directly from the project:

```bash
node ./bin/scrawl.js --help
```

> On Windows, Scrawl can fall back to an existing Playwright Chromium executable if `chrome-headless-shell` was not downloaded successfully.

### Enable AI commands

Set `GROQ_API_KEY` in the shell that runs Scrawl.

PowerShell:

```powershell
$env:GROQ_API_KEY="your_key_here"
```

Command Prompt:

```bat
set GROQ_API_KEY=your_key_here
```

Linux or macOS:

```bash
export GROQ_API_KEY="your_key_here"
```

An [.env.example](./.env.example) file is included as a reference. Scrawl currently reads the key from the process environment; it does not load `.env` files by itself.

## Practical recipes

### Build a Markdown dataset from a documentation site

```bash
scrawl crawl "https://docs.example.com" \
  --include "/guides,/reference" \
  --exclude "/changelog,/tags" \
  --max-pages 100 \
  --formats markdown \
  --output docs.json
```

### Extract every product link from a rendered catalog

```bash
scrawl extract "https://shop.example.com" \
  --selector "a.product-card" \
  --attr href \
  --multiple \
  --output products.json
```

### Find the API used by a single-page app

```bash
scrawl intercept "https://app.example.com" \
  --type api \
  --filter "/api/v2" \
  --output api-calls.json
```

### Monitor only the part of a page that matters

```bash
scrawl watch "https://example.com/status" \
  --selector ".service-status" \
  --interval 30s \
  --output changes.json
```

### Turn a page into an answer

```bash
scrawl ask "https://example.com/pricing" \
  "Which plan includes SSO, and how much does it cost?"
```

## Command reference

### `scrape` — render and extract one page

```bash
scrawl scrape <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `-f, --formats <list>` | Comma-separated `markdown`, `html`, and/or `json` | `markdown` |
| `-o, --output <file>` | Save the result | Print to stdout |
| `--wait-for <selector>` | Wait for a CSS selector before extraction | — |
| `--no-headless` | Show the browser window | Headless |
| `--timeout <ms>` | Navigation timeout | `30000` |

```bash
scrawl scrape "https://example.com"
scrawl scrape "https://example.com" -f markdown,html -o result.json
scrawl scrape "https://example.com" --wait-for "#main-content"
```

### `crawl` — collect content across a website

```bash
scrawl crawl <url> [options]
scrawl <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `-d, --depth <n>` | Maximum crawl depth | `2` |
| `-p, --max-pages <n>` | Maximum pages to collect | `10` |
| `-f, --formats <list>` | Comma-separated output formats | `markdown` |
| `-o, --output <file>` | Save all results | Print to stdout |
| `--include <patterns>` | Follow URLs containing any comma-separated pattern | — |
| `--exclude <patterns>` | Skip URLs containing any comma-separated pattern | — |
| `--no-headless` | Show the browser window | Headless |
| `--timeout <ms>` | Per-page timeout | `30000` |

```bash
scrawl crawl "https://example.com" -o results.json
scrawl crawl "https://example.com" --include "/blog" --exclude "/tag"
```

### `map` — discover same-domain URLs

```bash
scrawl map <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `-d, --depth <n>` | Maximum crawl depth | `3` |
| `-p, --max-pages <n>` | Maximum pages to visit | `100` |
| `-o, --output <file>` | Save the URL list | Print to stdout |

### `sitemap` — parse XML sitemaps

```bash
scrawl sitemap <url> [-o sitemap.json]
```

Scrawl tries `/sitemap.xml` and `/sitemap_index.xml`, then recursively follows nested sitemap indexes.

### `batch` — scrape a list concurrently

Create a text file with one URL per line. Empty lines and lines beginning with `#` are ignored.

```text
# urls.txt
https://example.com/
https://example.com/about
```

```bash
scrawl batch urls.txt --concurrency 5 --formats markdown -o results.json
```

| Option | Description | Default |
|---|---|---|
| `-c, --concurrency <n>` | Parallel workers | `3` |
| `-f, --formats <list>` | Comma-separated output formats | `markdown` |
| `-o, --output <file>` | Save all results | Print to stdout |

### `extract` — select exactly what you need

```bash
scrawl extract <url> --selector <css> [options]
```

| Option | Description | Default |
|---|---|---|
| `-s, --selector <css>` | CSS selector to extract; required | — |
| `-a, --attr <name>` | Attribute name, or `html` for `innerHTML` | Text content |
| `--multiple` | Return every match | First match |
| `-o, --output <file>` | Save the result | Print to stdout |

### `screenshot` — capture the rendered page

```bash
scrawl screenshot <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `-o, --output <file>` | Destination path | Timestamped filename |
| `--format <type>` | `png` or `jpeg` | `png` |
| `--no-full-page` | Capture only the viewport | Full page |
| `-s, --selector <css>` | Capture one element | Whole page |

### `pdf` — archive a page as PDF

```bash
scrawl pdf <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `-o, --output <file>` | Destination path | Timestamped filename |
| `--format <size>` | Chromium paper size such as `A4`, `Letter`, or `A3` | `A4` |
| `--landscape` | Use landscape orientation | Portrait |
| `--no-background` | Omit background graphics | Include backgrounds |

### `watch` — continuously detect changes

```bash
scrawl watch <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `-i, --interval <duration>` | Polling interval such as `30s`, `5m`, or `1h` | `5m` |
| `-s, --selector <css>` | Watch only one element | Whole page |
| `-o, --output <file>` | Persist detected changes | Terminal only |

Stop the watcher with `Ctrl+C`.

### `diff` — compare against a saved snapshot

```bash
scrawl diff <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `--since <file>` | Compare with a specific snapshot file | Latest URL snapshot |
| `-s, --selector <css>` | Compare only one element | Whole page |
| `-o, --output <file>` | Save added and removed lines | Terminal only |

On the first run, Scrawl creates a baseline. Later runs compare with it and update the snapshot. Snapshots live in `~/.scrawl/snapshots/`.

### `ask` — question answering with Groq

```bash
scrawl ask <url> <question> [options]
```

| Option | Description | Default |
|---|---|---|
| `--model <name>` | Groq model | `llama-3.1-8b-instant` |
| `-o, --output <file>` | Save the answer and metadata | Terminal only |

Requires `GROQ_API_KEY`.

### `summarize` — summarize with Groq

```bash
scrawl summarize <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `--length <size>` | `short`, `medium`, or `long` | `medium` |
| `--model <name>` | Groq model | `llama-3.1-8b-instant` |
| `-o, --output <file>` | Save the summary and metadata | Terminal only |

Requires `GROQ_API_KEY`.

### `intercept` — inspect network responses

```bash
scrawl intercept <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `--type <kind>` | `all`, `xhr`, `fetch`, or `api` | `all` |
| `--filter <pattern>` | Keep URLs containing a string | — |
| `-o, --output <file>` | Save captured calls | Print to stdout |

For JSON responses, Scrawl also attempts to capture the parsed response body.

### `assets` — list or download page assets

```bash
scrawl assets <url> [options]
```

| Option | Description | Default |
|---|---|---|
| `--types <list>` | Comma-separated `images`, `pdfs`, `videos`, `audio`, `docs` | `images` |
| `--output-dir <dir>` | Download directory | `./assets` |
| `--no-download` | List assets without downloading | Download |
| `-o, --output <file>` | Save the asset list without downloading | — |

## Output formats

When a command supports `--formats`, choose one or more values separated by commas:

- `markdown` converts the rendered `<body>` with Turndown.
- `html` keeps the fully rendered page source.
- `json` extracts the title, description where available, headings, links, and images.

The output file extension controls serialization:

| Extension | Behavior |
|---|---|
| `.json` | Pretty-printed JSON |
| `.md` | Markdown content, grouped by URL for multiple pages |
| `.html` | Rendered HTML |
| `.csv` | Flat result metadata |

## How it works

```text
URL → Chromium/Playwright → rendered DOM → extraction → terminal or file
                         ↘ network capture
                         ↘ screenshots / PDF
                         ↘ Markdown → Groq → answer / summary
```

| Layer | Technology |
|---|---|
| Browser automation | [Playwright](https://playwright.dev/) |
| Multi-page crawling | [Crawlee](https://crawlee.dev/) |
| AI answers and summaries | [Groq SDK](https://console.groq.com/) |
| HTML to Markdown | [Turndown](https://github.com/mixmark-io/turndown) |
| CLI interface | [Commander.js](https://github.com/tj/commander.js/) |

## Responsible use

Only scrape pages you are authorized to access. Respect site terms, robots directives, copyright, privacy, rate limits, and applicable law. Keep concurrency and crawl limits conservative when working with third-party infrastructure.

## Development

```bash
git clone https://github.com/Renat0z/scrawl.git
cd scrawl
npm install
npx playwright install chromium
node ./bin/scrawl.js --help
```

Project layout:

```text
bin/scrawl.js       CLI commands and options
src/commands/       Command implementations
src/lib/browser.js  Browser lifecycle and DOM extraction
src/lib/output.js   Terminal and file serialization
src/lib/ai.js       Groq integration
src/lib/utils.js    URLs, intervals, hashes, and snapshots
```

## Ready to pull useful data from the modern web?

Start with one page:

```bash
scrawl scrape "https://example.com"
```

Then move from reading a page to crawling a site, extracting a field, watching for changes, or asking a direct question—all without leaving the terminal.
