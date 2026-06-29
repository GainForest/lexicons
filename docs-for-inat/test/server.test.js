import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createServer, readArchitectureMarkdown, renderMarkdown } from "../src/server.js";

function listen(server) {
  return new Promise((resolve) => {
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      resolve(`http://${address.address}:${address.port}`);
    });
  });
}

describe("documentation app", () => {
  it("renders markdown headings, links, inline code, and tables", () => {
    const html = renderMarkdown(`# Title\n\nRead [docs](./docs.md) with \`code\`.\n\n| A | B |\n|---|---|\n| **x** | y |`);

    assert.match(html, /<h1 id="title">Title<\/h1>/);
    assert.match(html, /<a href="\.\/docs\.md">docs<\/a>/);
    assert.match(html, /<code>code<\/code>/);
    assert.match(html, /<table>/);
    assert.match(html, /<strong>x<\/strong>/);
  });

  it("serves the rendered UI at /", async () => {
    const server = createServer();
    const origin = await listen(server);

    try {
      const response = await fetch(`${origin}/`);
      const html = await response.text();

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/html; charset=utf-8");
      assert.match(html, /Hypersphere Architecture/);
      assert.match(html, /href="\/architecture\.md"/);
      assert.match(html, /What We Are Building/);
    } finally {
      server.close();
    }
  });

  it("serves the raw markdown at /architecture.md", async () => {
    const server = createServer();
    const origin = await listen(server);

    try {
      const [expected, response] = await Promise.all([
        readArchitectureMarkdown(),
        fetch(`${origin}/architecture.md`),
      ]);
      const raw = await response.text();

      assert.equal(response.status, 200);
      assert.equal(response.headers.get("content-type"), "text/markdown; charset=utf-8");
      assert.equal(raw, expected);
    } finally {
      server.close();
    }
  });
});
