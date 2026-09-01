import assert from "node:assert/strict";
import test from "node:test";
import { renderMarkdown } from "../app/report.js";

test("renders report Markdown while removing active content", () => {
  const rendered = renderMarkdown("# Report\n\n| A | B |\n|---|---|\n| 1 | 2 |\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))");
  assert.match(rendered, /<h1>Report<\/h1>/);
  assert.match(rendered, /<table>/);
  assert.doesNotMatch(rendered, /<script|href=["']javascript:/i);
});
