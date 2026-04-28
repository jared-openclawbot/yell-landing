/**
 * Simple HTML minifier for production output.
 * Removes unnecessary whitespace, comments, and newlines.
 */

export interface MinifyOptions {
  removeComments?: boolean;
  collapseWhitespace?: boolean;
  minifyCSS?: boolean;
}

const DEFAULT_OPTIONS: MinifyOptions = {
  removeComments: true,
  collapseWhitespace: true,
  minifyCSS: false,
};

/**
 * Minify an HTML string.
 * Note: this is a simple regex-based minifier suitable for Yell's output.
 * For production use with complex HTML, consider using html-minifier-terser.
 */
export function minifyHTML(html: string, options: MinifyOptions = DEFAULT_OPTIONS): string {
  let result = html;

  // Remove HTML comments
  if (options.removeComments) {
    result = result.replace(/<!--[\s\S]*?-->/g, '');
  }

  // Collapse whitespace between tags
  if (options.collapseWhitespace) {
    // Remove newlines and multiple spaces between tags
    result = result.replace(/>\s+</g, '><');
    result = result.replace(/\s{2,}/g, ' ');
    // But preserve whitespace inside <pre>, <textarea>, <style>, <script>
    // (handle these by restoring content in those tags)
    result = result.replace(/(<(?:pre|style|script|textarea)[^>]*>)([\s\S]*?)(<\/\1>)/gi, (match, open, content, close) => {
      return open + content.replace(/\s+/g, ' ') + close;
    });
    // Remove spaces around attributes
    result = result.replace(/\s+(\w+=)/g, '$1');
    result = result.replace(/(\w+=)\s+/g, '$1');
  }

  // Remove unnecessary attributes (empty data-* attributes)
  result = result.replace(/\s+data-(\w+)=""/g, '');

  // Collapse multiple spaces inside attribute values
  result = result.replace(/(\w+="[^"]*?)\s{2,}([^"]*?")/g, '$1 $2');

  // Remove trailing slash from self-closing tags (HTML5 style)
  // But keep it for void elements
  result = result.replace(/<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)([^>]*)\/>/gi, '<$1$2>');

  return result.trim();
}

/**
 * Minify a CSS string (basic minification).
 */
export function minifyCSS(css: string): string {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, '') // remove comments
    .replace(/\s+/g, ' ')              // collapse whitespace
    .replace(/\s*([{}:;,])\s*/g, '$1') // remove spaces around special chars
    .replace(/;}/g, '}')               // remove last semicolon before }
    .trim();
}
