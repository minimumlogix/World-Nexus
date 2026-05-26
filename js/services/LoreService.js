/* js/services/LoreService.js */

export class LoreService {
  /**
   * Fetches markdown content from a path and returns parsed HTML.
   * @param {string} url - Location of the markdown file
   * @returns {Promise<string>} HTML markup
   */
  static async loadLore(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const markdown = await response.text();
      return this.parseMarkdown(markdown);
    } catch (err) {
      console.error(`LoreService failed to load markdown at "${url}":`, err);
      return `<p class="lore-error-msg">Could not load historical lore logs: ${err.message}</p>`;
    }
  }

  /**
   * Translates Markdown text into HTML strings.
   * Supports headers, bold, italics, lists, images, and links.
   * @param {string} md - Raw markdown text
   * @returns {string} HTML markup
   */
  static parseMarkdown(md) {
    if (!md) return '';

    // Normalize line breaks
    let html = md.replace(/\r\n/g, '\n').trim();

    // 1. Headers
    html = html.replace(/^#\s+(.+)$/gm, '<h1>$1</h1>');
    html = html.replace(/^##\s+(.+)$/gm, '<h2>$1</h2>');
    html = html.replace(/^###\s+(.+)$/gm, '<h3>$1</h3>');

    // 2. Bold / Italic
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');

    // 3. Images: ![alt](url)
    html = html.replace(/!\[(.*?)\]\((.*?)\)/g, '<img src="$2" alt="$1" class="lore-image" />');

    // 4. Links: [text](url)
    html = html.replace(/\[(.*?)\]\((.*?)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    // 5. Structure blocks (lists, paragraphs)
    const lines = html.split('\n');
    const processedLines = [];
    let insideUl = false;
    let insideOl = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Unordered lists
      if (line.startsWith('* ') || line.startsWith('- ')) {
        if (insideOl) {
          processedLines.push('</ol>');
          insideOl = false;
        }
        if (!insideUl) {
          processedLines.push('<ul>');
          insideUl = true;
        }
        processedLines.push(`<li>${line.substring(2)}</li>`);
        continue;
      }

      // Ordered lists
      const olMatch = line.match(/^\d+\.\s+(.+)$/);
      if (olMatch) {
        if (insideUl) {
          processedLines.push('</ul>');
          insideUl = false;
        }
        if (!insideOl) {
          processedLines.push('<ol>');
          insideOl = true;
        }
        processedLines.push(`<li>${olMatch[1]}</li>`);
        continue;
      }

      // List termination
      if (insideUl && !line.startsWith('* ') && !line.startsWith('- ')) {
        processedLines.push('</ul>');
        insideUl = false;
      }
      if (insideOl && !olMatch) {
        processedLines.push('</ol>');
        insideOl = false;
      }

      // Empty spacing
      if (line === '') {
        continue;
      }

      // Wrap standard plain text into paragraphs, leaving tags intact
      if (
        !line.startsWith('<h') && 
        !line.startsWith('<u') && 
        !line.startsWith('<o') && 
        !line.startsWith('<l') && 
        !line.startsWith('<i') && 
        !line.startsWith('<p') &&
        !line.startsWith('<a')
      ) {
        processedLines.push(`<p>${line}</p>`);
      } else {
        processedLines.push(line);
      }
    }

    // Clean up residual open lists
    if (insideUl) processedLines.push('</ul>');
    if (insideOl) processedLines.push('</ol>');

    return processedLines.join('\n');
  }
}
export default LoreService;
