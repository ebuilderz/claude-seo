import MarkdownIt from "markdown-it";
import sanitizeHtml from "sanitize-html";

const markdown = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
});

export function renderMarkdown(value) {
  return sanitizeHtml(markdown.render(String(value || "")), {
    allowedTags: [
      "h1", "h2", "h3", "h4", "h5", "h6", "p", "br", "hr", "blockquote",
      "ul", "ol", "li", "strong", "em", "del", "code", "pre", "table",
      "thead", "tbody", "tr", "th", "td", "a",
    ],
    allowedAttributes: { a: ["href", "title", "target", "rel"] },
    allowedSchemes: ["http", "https", "mailto"],
    transformTags: {
      a: (_tagName, attribs) => ({
        tagName: "a",
        attribs: { ...attribs, target: "_blank", rel: "noopener noreferrer" },
      }),
    },
  });
}
