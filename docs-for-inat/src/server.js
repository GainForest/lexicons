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
    * { box-sizing: border-box; }

    body {
      margin: 0;
      background: #ffffff;
      color: #000000;
      font-family: Arial, Helvetica, sans-serif;
      font-size: 16px;
      line-height: 1.55;
    }

    main {
      width: min(900px, calc(100% - 32px));
      margin: 0 auto;
      padding: 32px 0 64px;
    }

    nav {
      margin-bottom: 32px;
    }

    a {
      color: #000000;
    }

    h1, h2, h3, h4, h5, h6 {
      line-height: 1.2;
      margin: 2rem 0 0.75rem;
    }

    h1 {
      font-size: 2rem;
      margin-top: 0;
    }

    h2 { font-size: 1.5rem; }
    h3 { font-size: 1.2rem; }

    p { margin: 0 0 1rem; }
    ul, ol { padding-left: 1.5rem; }
    li + li { margin-top: 0.25rem; }

    code, pre {
      font-family: "Courier New", Courier, monospace;
    }

    code {
      background: #f2f2f2;
      padding: 0.1rem 0.25rem;
    }

    pre {
      background: #f2f2f2;
      overflow-x: auto;
      padding: 1rem;
    }

    hr {
      border: 0;
      border-top: 1px solid #000000;
      margin: 2rem 0;
    }

    .table-frame {
      overflow-x: auto;
      margin: 1rem 0;
    }

    table {
      border-collapse: collapse;
      width: 100%;
    }

    th, td {
      border: 1px solid #000000;
      padding: 0.5rem;
      text-align: left;
      vertical-align: top;
    }
  </style>
</head>
<body>
  <main>
    <nav aria-label="Document routes">
      <a href="/architecture.md">Raw markdown</a>
    </nav>
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
