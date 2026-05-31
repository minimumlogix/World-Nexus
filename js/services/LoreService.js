/* js/services/LoreService.js */
import { marked } from 'https://cdn.jsdelivr.net/npm/marked/lib/marked.esm.js';
import { DOM } from '../utils/DOM.js';

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
   * Translates Markdown text into HTML strings using marked.js.
   * Supports AAA level markdown features: headers, blockquotes, lists, code, hr, links, responsive images, html.
   * @param {string} md - Raw markdown text
   * @returns {string} HTML markup
   */
  static parseMarkdown(md) {
    if (!md) return '';
    
    // Set up custom renderer to maintain original Nexus styling classes
    const renderer = new marked.Renderer();
    
    renderer.image = (hrefOrToken, title, text) => {
      // Handle marked.js v12+ token object signature, as well as older string signature
      let href = hrefOrToken;
      if (typeof hrefOrToken === 'object' && hrefOrToken !== null) {
        href = hrefOrToken.href;
        title = hrefOrToken.title;
        text = hrefOrToken.text;
      }
      // Create responsive image with proper lore-image class
      const titleAttr = title ? ` title="${title}"` : '';
      return `<img src="${href}" alt="${text || ''}"${titleAttr} class="lore-image" loading="lazy" />`;
    };
    
    renderer.link = (hrefOrToken, title, text) => {
      let href = hrefOrToken;
      if (typeof hrefOrToken === 'object' && hrefOrToken !== null) {
        href = hrefOrToken.href;
        title = hrefOrToken.title;
        text = hrefOrToken.tokens ? hrefOrToken.tokens.map(t => t.raw).join('') : hrefOrToken.text;
      }
      
      const titleAttr = title ? ` title="${title}"` : '';

      // Auto-resolve internal links if they don't start with common protocols or paths
      if (!href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#') && !href.startsWith('/')) {
        return `<a href="${href}"${titleAttr} class="lore-link auto-resolve-link">${text}</a>`;
      }

      // Ensure external links open in new tab securely
      return `<a href="${href}"${titleAttr} class="lore-link" target="_blank" rel="noopener noreferrer">${text}</a>`;
    };

    // Parse options
    marked.setOptions({
      renderer: renderer,
      gfm: true,
      breaks: true, // support Line Breaks
      smartLists: true,
      smartypants: true
    });

    return marked.parse(md);
  }

  /**
   * Parses markdown HTML, segments it into cards, and builds a hierarchical sidebar menu.
   * Modifies the contentNode and navNode DOM directly.
   */
  static buildHierarchicalLore(htmlContent, contentNode, navNode) {
    contentNode.innerHTML = htmlContent;

    // Arrange headings into card wrappers
    const children = contentNode.children ? Array.from(contentNode.children) : [];
    contentNode.innerHTML = '';
    
    let currentCard = null;
    children.forEach(child => {
      if (child.tagName === 'H1') return; // Skip H1 to avoid duplicate title
      
      if (child.tagName === 'H2') {
        currentCard = DOM.el('div', { class: 'lore-card' });
        contentNode.appendChild(currentCard);
        currentCard.appendChild(child);
      } else {
        if (!currentCard) {
          currentCard = DOM.el('div', { class: 'lore-card' });
          contentNode.appendChild(currentCard);
        }
        currentCard.appendChild(child);
      }
    });

    // Build hierarchical side table-of-contents
    const headings = contentNode.querySelectorAll('h2, h3');
    DOM.clear(navNode);

    let currentH2Item = null;
    let currentH2SubList = null;

    headings.forEach((heading, index) => {
      const headingId = `world-lore-anchor-${index}`;
      heading.id = headingId;

      const navLink = DOM.el('a', {
        href: `#${headingId}`,
        class: 'lore-nav-link',
        onclick: (e) => {
          e.preventDefault();
          heading.scrollIntoView({ behavior: 'smooth', block: 'start' });
          document.querySelectorAll('.lore-nav-link').forEach(a => a.classList.remove('active'));
          navLink.classList.add('active');
        }
      }, heading.textContent);

      if (heading.tagName === 'H2') {
        currentH2SubList = DOM.el('ul', { class: 'lore-nav-sublist', style: 'display: none;' });
        
        const toggleBtn = DOM.el('span', { class: 'lore-nav-toggle' }, '▶');
        toggleBtn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const isHidden = currentH2SubList.style.display === 'none';
          currentH2SubList.style.display = isHidden ? 'flex' : 'none';
          toggleBtn.textContent = isHidden ? '▼' : '▶';
        });

        const headerWrapper = DOM.el('div', { class: 'lore-nav-header' }, toggleBtn, navLink);
        currentH2Item = DOM.el('li', { class: 'lore-nav-item-h2' }, headerWrapper, currentH2SubList);
        navNode.appendChild(currentH2Item);
        
        // If an H2 is clicked, auto-expand its children
        navLink.addEventListener('click', () => {
          if (currentH2SubList.style.display === 'none') {
            currentH2SubList.style.display = 'flex';
            toggleBtn.textContent = '▼';
          }
        });
      } else if (heading.tagName === 'H3') {
        if (!currentH2SubList) {
          // If H3 appears before any H2, attach to root level
          navNode.appendChild(DOM.el('li', { class: 'lore-nav-item-h3 root-h3' }, navLink));
        } else {
          currentH2SubList.appendChild(DOM.el('li', { class: 'lore-nav-item-h3' }, navLink));
          
          // Expand parent if child is clicked
          navLink.addEventListener('click', () => {
            currentH2SubList.style.display = 'flex';
            currentH2SubList.previousElementSibling.querySelector('.lore-nav-toggle').textContent = '▼';
          });
        }
      }
    });
  }
}
export default LoreService;

