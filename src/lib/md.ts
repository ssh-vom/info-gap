import { marked } from 'marked';

// ponytail: anyone can post (no auth yet) -> markdown is a trust boundary.
// No DOM sanitizer dep (Workers has no DOM). Renderer overrides neutralize the
// real vectors: raw HTML is dropped, link/image URLs are scheme-checked.
// Swap for DOMPurify/sanitize-html only if you ever allow inline HTML.
const esc = (s = '') =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const safeUrl = (href = '') => (/^(https?:|mailto:|\/|#)/i.test(href.trim()) ? href.trim() : '#');

marked.use({
  renderer: {
    html() {
      return '';
    },
    link(token) {
      const href = esc(safeUrl(token.href));
      const text = this.parser.parseInline(token.tokens);
      const title = token.title ? ` title="${esc(token.title)}"` : '';
      const ext = href.startsWith('http') ? ' target="_blank"' : '';
      return `<a href="${href}"${title} rel="noopener nofollow"${ext}>${text}</a>`;
    },
    image(token) {
      const src = esc(safeUrl(token.href));
      const title = token.title ? ` title="${esc(token.title)}"` : '';
      return `<img src="${src}" alt="${esc(token.text)}"${title} loading="lazy">`;
    },
  },
});

export function render(md: string): string {
  return marked.parse(md ?? '', { async: false });
}

// run check: node --experimental-strip-types src/lib/md.ts
// (workerd defines `process` but NOT `process.argv`, so gate on argv — else this
//  throws on import in the Worker and 500s any page that calls render())
if (typeof process !== 'undefined' && import.meta.url === `file://${process.argv?.[1]}`) {
  const out = render('# hi\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1)) [ok](https://a.com)');
  console.assert(!out.includes('<script>'), 'raw HTML must be dropped');
  console.assert(!out.includes('javascript:'), 'js: scheme must be neutralized');
  console.assert(out.includes('href="https://a.com"'), 'safe links survive');
  console.log('md.ts ok\n', out);
}
