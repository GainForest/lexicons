import { createServer as createHttpServer } from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARCHITECTURE_PATH = path.join(__dirname, "..", "architecture.md");
const PORT = Number.parseInt(process.env.PORT ?? "3000", 10);

export async function readArchitectureMarkdown() {
  return readFile(ARCHITECTURE_PATH, "utf8");
}

function escapeHtml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function sanitizeHref(href) {
  if (/^(https?:|mailto:)/i.test(href)) {
    return href;
  }

  if (href.startsWith("#") || href.startsWith("/") || href.startsWith("../") || href.startsWith("./")) {
    return href;
  }

  return "#";
}

function renderInline(markdown) {
  let html = "";
  let cursor = 0;

  while (cursor < markdown.length) {
    if (markdown.startsWith("`", cursor)) {
      const end = markdown.indexOf("`", cursor + 1);
      if (end !== -1) {
        html += `<code>${escapeHtml(markdown.slice(cursor + 1, end))}</code>`;
        cursor = end + 1;
        continue;
      }
    }

    if (markdown.startsWith("**", cursor)) {
      const end = markdown.indexOf("**", cursor + 2);
      if (end !== -1) {
        html += `<strong>${renderInline(markdown.slice(cursor + 2, end))}</strong>`;
        cursor = end + 2;
        continue;
      }
    }

    if (markdown.startsWith("[", cursor)) {
      const labelEnd = markdown.indexOf("]", cursor + 1);
      const urlStart = labelEnd === -1 ? -1 : markdown.indexOf("(", labelEnd);
      const urlEnd = urlStart === -1 ? -1 : markdown.indexOf(")", urlStart);

      if (labelEnd !== -1 && urlStart === labelEnd + 1 && urlEnd !== -1) {
        const label = markdown.slice(cursor + 1, labelEnd);
        const href = sanitizeHref(markdown.slice(urlStart + 1, urlEnd));
        html += `<a href="${escapeHtml(href)}">${renderInline(label)}</a>`;
        cursor = urlEnd + 1;
        continue;
      }
    }

    const nextSpecial = ["`", "**", "["]
      .map((token) => markdown.indexOf(token, cursor + 1))
      .filter((index) => index !== -1)
      .sort((a, b) => a - b)[0];
    const end = nextSpecial ?? markdown.length;
    html += escapeHtml(markdown.slice(cursor, end));
    cursor = end;
  }

  return html;
}

function isTableStart(lines, index) {
  return (
    lines[index]?.trim().startsWith("|") &&
    /^\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)+\|?$/.test(lines[index + 1]?.trim() ?? "")
  );
}

function splitTableRow(line) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function renderTable(lines, startIndex) {
  const header = splitTableRow(lines[startIndex]);
  const body = [];
  let cursor = startIndex + 2;

  while (cursor < lines.length && lines[cursor].trim().startsWith("|")) {
    body.push(splitTableRow(lines[cursor]));
    cursor += 1;
  }

  const headerHtml = header.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
  const rowsHtml = body
    .map((row) => `<tr>${row.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("\n");

  return {
    html: `<div class="table-frame"><table><thead><tr>${headerHtml}</tr></thead><tbody>${rowsHtml}</tbody></table></div>`,
    nextIndex: cursor,
  };
}

function isBlockStart(lines, index) {
  const line = lines[index] ?? "";
  return (
    line.trim() === "" ||
    /^#{1,6}\s+/.test(line) ||
    /^---+$/.test(line.trim()) ||
    /^\d+\.\s+/.test(line) ||
    /^-\s+/.test(line) ||
    line.startsWith("```") ||
    isTableStart(lines, index)
  );
}

function renderList(lines, startIndex, ordered) {
  const tag = ordered ? "ol" : "ul";
  const matcher = ordered ? /^\d+\.\s+(.+)$/ : /^-\s+(.+)$/;
  let cursor = startIndex;
  const items = [];

  while (cursor < lines.length) {
    const match = lines[cursor].match(matcher);
    if (!match) {
      break;
    }
    items.push(`<li>${renderInline(match[1])}</li>`);
    cursor += 1;
  }

  return { html: `<${tag}>${items.join("")}</${tag}>`, nextIndex: cursor };
}

export function renderMarkdown(markdown) {
  const lines = markdown.replaceAll("\r\n", "\n").split("\n");
  const blocks = [];
  let cursor = 0;

  while (cursor < lines.length) {
    const line = lines[cursor];
    const trimmed = line.trim();

    if (!trimmed) {
      cursor += 1;
      continue;
    }

    if (line.startsWith("```")) {
      const language = line.slice(3).trim();
      const code = [];
      cursor += 1;
      while (cursor < lines.length && !lines[cursor].startsWith("```")) {
        code.push(lines[cursor]);
        cursor += 1;
      }
      cursor += 1;
      blocks.push(`<pre><code data-language="${escapeHtml(language)}">${escapeHtml(code.join("\n"))}</code></pre>`);
      continue;
    }

    const heading = line.match(/^(#{1,6})\s+(.+)$/);
    if (heading) {
      const level = heading[1].length;
      const id = heading[2]
        .toLowerCase()
        .replace(/[`*_]/g, "")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/(^-|-$)/g, "");
      blocks.push(`<h${level} id="${escapeHtml(id)}">${renderInline(heading[2])}</h${level}>`);
      cursor += 1;
      continue;
    }

    if (/^---+$/.test(trimmed)) {
      blocks.push("<hr />");
      cursor += 1;
      continue;
    }

    if (isTableStart(lines, cursor)) {
      const table = renderTable(lines, cursor);
      blocks.push(table.html);
      cursor = table.nextIndex;
      continue;
    }

    if (/^\d+\.\s+/.test(line)) {
      const list = renderList(lines, cursor, true);
      blocks.push(list.html);
      cursor = list.nextIndex;
      continue;
    }

    if (/^-\s+/.test(line)) {
      const list = renderList(lines, cursor, false);
      blocks.push(list.html);
      cursor = list.nextIndex;
      continue;
    }

    const paragraph = [];
    while (cursor < lines.length && !isBlockStart(lines, cursor)) {
      paragraph.push(lines[cursor].trim());
      cursor += 1;
    }
    blocks.push(`<p>${renderInline(paragraph.join(" "))}</p>`);
  }

  return blocks.join("\n");
}

function renderPage(markdown) {
  const article = renderMarkdown(markdown);

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>GainForest Hypersphere Architecture</title>
  <style>
    :root {
      color-scheme: dark;
      --ink: #eef8df;
      --muted: #abc3a1;
      --moss: #8bcf69;
      --liana: #d9ff8d;
      --bark: #182015;
      --deep: #071008;
      --panel: rgba(20, 34, 21, 0.74);
      --line: rgba(217, 255, 141, 0.22);
      --shadow: 0 30px 90px rgba(0, 0, 0, 0.35);
    }

    * { box-sizing: border-box; }
    html { scroll-behavior: smooth; }
    body {
      margin: 0;
      min-height: 100vh;
      background:
        radial-gradient(circle at 12% 7%, rgba(139, 207, 105, 0.22), transparent 34rem),
        radial-gradient(circle at 87% 3%, rgba(217, 255, 141, 0.13), transparent 32rem),
        linear-gradient(135deg, #081209 0%, #11180f 42%, #071008 100%);
      color: var(--ink);
      font-family: ui-serif, Georgia, Cambria, "Times New Roman", serif;
      line-height: 1.68;
    }

    body::before {
      content: "";
      position: fixed;
      inset: 0;
      pointer-events: none;
      opacity: 0.12;
      background-image:
        linear-gradient(rgba(238, 248, 223, 0.12) 1px, transparent 1px),
        linear-gradient(90deg, rgba(238, 248, 223, 0.08) 1px, transparent 1px);
      background-size: 44px 44px;
      mask-image: radial-gradient(circle at center, black, transparent 78%);
    }

    .shell {
      width: min(1120px, calc(100% - 32px));
      margin: 0 auto;
      padding: 34px 0 72px;
    }

    .topbar {
      align-items: center;
      display: flex;
      gap: 16px;
      justify-content: space-between;
      margin-bottom: 46px;
    }

    .brand {
      color: var(--liana);
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: 0.8rem;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }

    .raw-link {
      border: 1px solid var(--line);
      border-radius: 999px;
      color: var(--deep);
      background: var(--liana);
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: 0.82rem;
      font-weight: 700;
      padding: 10px 16px;
      text-decoration: none;
      transition: transform 160ms ease, box-shadow 160ms ease;
    }

    .raw-link:hover {
      box-shadow: 0 12px 34px rgba(217, 255, 141, 0.22);
      transform: translateY(-2px);
    }

    .hero {
      border: 1px solid var(--line);
      border-radius: 34px;
      background: linear-gradient(135deg, rgba(238, 248, 223, 0.08), rgba(139, 207, 105, 0.08));
      box-shadow: var(--shadow);
      margin-bottom: 26px;
      overflow: hidden;
      padding: clamp(28px, 7vw, 76px);
      position: relative;
    }

    .hero::after {
      content: "ATProto × DwC × Hypersphere";
      bottom: 24px;
      color: rgba(217, 255, 141, 0.18);
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: clamp(1.7rem, 6vw, 6rem);
      font-weight: 800;
      line-height: 0.9;
      position: absolute;
      right: -18px;
      text-align: right;
      width: min-content;
      z-index: 0;
    }

    .hero > * { position: relative; z-index: 1; }
    .eyebrow {
      color: var(--moss);
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: 0.78rem;
      letter-spacing: 0.18em;
      text-transform: uppercase;
    }

    h1, h2, h3, h4, h5, h6 {
      line-height: 1.08;
      margin: 2.25rem 0 0.85rem;
      text-wrap: balance;
    }

    .hero h1 {
      font-size: clamp(3.2rem, 10vw, 8.2rem);
      letter-spacing: -0.08em;
      margin: 0.28em 0 0.18em;
      max-width: 850px;
    }

    .hero p {
      color: var(--muted);
      font-size: clamp(1.1rem, 2vw, 1.35rem);
      max-width: 720px;
    }

    article {
      backdrop-filter: blur(18px);
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 34px;
      box-shadow: var(--shadow);
      padding: clamp(24px, 5vw, 64px);
    }

    article h1:first-child,
    article h1:first-child + p,
    article h1:first-child + p + p,
    article h1:first-child + p + p + hr { display: none; }

    h2 {
      border-top: 1px solid var(--line);
      color: var(--liana);
      font-size: clamp(2rem, 4vw, 3.6rem);
      letter-spacing: -0.045em;
      padding-top: 2rem;
    }

    h3 {
      color: var(--ink);
      font-size: clamp(1.35rem, 2.4vw, 2.05rem);
      letter-spacing: -0.025em;
    }

    p, li { color: rgba(238, 248, 223, 0.88); }
    p { margin: 0.7rem 0 1.1rem; }
    ul, ol { padding-left: 1.5rem; }
    li + li { margin-top: 0.42rem; }
    a { color: var(--liana); text-decoration-color: rgba(217, 255, 141, 0.42); text-underline-offset: 0.18em; }
    strong { color: #ffffff; }
    code {
      background: rgba(7, 16, 8, 0.72);
      border: 1px solid rgba(217, 255, 141, 0.16);
      border-radius: 0.45em;
      color: #e4ffb0;
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: 0.9em;
      padding: 0.12em 0.34em;
    }

    hr {
      border: 0;
      border-top: 1px dashed var(--line);
      margin: 2.2rem 0;
    }

    .table-frame {
      border: 1px solid var(--line);
      border-radius: 20px;
      margin: 1.3rem 0 1.9rem;
      overflow-x: auto;
    }

    table {
      border-collapse: collapse;
      min-width: 100%;
    }

    th, td {
      border-bottom: 1px solid rgba(217, 255, 141, 0.15);
      padding: 0.78rem 0.9rem;
      text-align: left;
      vertical-align: top;
    }

    th {
      background: rgba(217, 255, 141, 0.1);
      color: #ffffff;
      font-family: ui-monospace, "SFMono-Regular", Consolas, monospace;
      font-size: 0.77rem;
      letter-spacing: 0.08em;
      text-transform: uppercase;
    }

    tr:last-child td { border-bottom: 0; }

    @media (max-width: 680px) {
      .topbar { align-items: flex-start; flex-direction: column; }
      .hero, article { border-radius: 24px; }
    }
  </style>
</head>
<body>
  <main class="shell">
    <nav class="topbar" aria-label="Document routes">
      <span class="brand">GainForest docs for iNaturalist</span>
      <a class="raw-link" href="/architecture.md">Raw markdown</a>
    </nav>
    <header class="hero">
      <div class="eyebrow">Architecture briefing</div>
      <h1>Hypersphere Architecture</h1>
      <p>Self-sovereign biodiversity observations, Darwin Core-aligned lexicons, decentralized evaluators, and auditable conservation evidence on AT Protocol.</p>
    </header>
    <article aria-label="Rendered architecture document">
      ${article}
    </article>
  </main>
</body>
</html>`;
}

function send(res, statusCode, headers, body) {
  res.writeHead(statusCode, {
    "Cache-Control": "no-store",
    ...headers,
  });
  res.end(body);
}

export async function handleRequest(req, res) {
  const url = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

  try {
    if (url.pathname === "/") {
      const markdown = await readArchitectureMarkdown();
      send(res, 200, { "Content-Type": "text/html; charset=utf-8" }, renderPage(markdown));
      return;
    }

    if (url.pathname === "/architecture.md") {
      const markdown = await readArchitectureMarkdown();
      send(res, 200, { "Content-Type": "text/markdown; charset=utf-8" }, markdown);
      return;
    }

    send(res, 404, { "Content-Type": "text/plain; charset=utf-8" }, "Not found. Try / or /architecture.md.\n");
  } catch (error) {
    console.error(error);
    send(res, 500, { "Content-Type": "text/plain; charset=utf-8" }, "Unable to load architecture.md.\n");
  }
}

export function createServer() {
  return createHttpServer(handleRequest);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => {
    console.log(`docs-for-inat is running at http://localhost:${PORT}`);
    console.log(`Raw markdown is available at http://localhost:${PORT}/architecture.md`);
  });
}
