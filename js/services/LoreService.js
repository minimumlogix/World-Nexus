/* js/services/LoreService.js */
import { marked } from '../lib/marked.esm.js';
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
      // Prepend the repo base path to absolute image paths for GitHub Pages.
      // On localhost, absolute paths already resolve correctly, so skip this.
      const isLocalhost = ['localhost', '127.0.0.1'].includes(window.location.hostname);
      if (!isLocalhost && href && href.startsWith('/')) {
        const repoSegment = window.location.pathname.split('/')[1];
        if (repoSegment) href = '/' + repoSegment + href;
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
      if (href && !href.startsWith('http') && !href.startsWith('mailto:') && !href.startsWith('tel:') && !href.startsWith('#') && !href.startsWith('/')) {
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
    const headings = Array.from(contentNode.querySelectorAll('h2, h3'));
    DOM.clear(navNode);
    
    const rootList = DOM.el('ul', { class: 'lore-nav-list' });
    navNode.appendChild(rootList);

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
        // Check if there are any H3s before the next H2
        let hasChildren = false;
        for (let j = index + 1; j < headings.length; j++) {
          if (headings[j].tagName === 'H2') break;
          if (headings[j].tagName === 'H3') {
            hasChildren = true;
            break;
          }
        }

        if (hasChildren) {
          const subList = DOM.el('ul', { class: 'lore-nav-sublist', style: 'display: none;' });
          currentH2SubList = subList;
          
          // Create SVG chevron
          const svgNS = 'http://www.w3.org/2000/svg';
          const chevron = document.createElementNS(svgNS, 'svg');
          chevron.setAttribute('viewBox', '0 0 24 24');
          chevron.setAttribute('class', 'lore-nav-chevron');
          const path = document.createElementNS(svgNS, 'path');
          path.setAttribute('d', 'M9 18l6-6-6-6');
          path.setAttribute('fill', 'none');
          path.setAttribute('stroke', 'currentColor');
          path.setAttribute('stroke-width', '2');
          path.setAttribute('stroke-linecap', 'round');
          path.setAttribute('stroke-linejoin', 'round');
          chevron.appendChild(path);

          const toggleBtn = DOM.el('span', { class: 'lore-nav-toggle' }, chevron);
          
          const toggleExpand = (e) => {
            if (e) {
              e.preventDefault();
              e.stopPropagation();
            }
            const isHidden = subList.style.display === 'none';
            subList.style.display = isHidden ? 'block' : 'none';
            if (isHidden) {
              toggleBtn.classList.add('expanded');
            } else {
              toggleBtn.classList.remove('expanded');
            }
          };
          
          toggleBtn.addEventListener('click', toggleExpand);

          // If H2 is clicked, auto-expand its children
          navLink.addEventListener('click', () => {
            if (subList.style.display === 'none') {
              toggleExpand();
            }
          });

          const headerWrapper = DOM.el('div', { class: 'lore-nav-header has-children' }, toggleBtn, navLink);
          currentH2Item = DOM.el('li', { class: 'lore-nav-item-h2' }, headerWrapper, subList);
          rootList.appendChild(currentH2Item);
        } else {
          currentH2SubList = null;
          const headerWrapper = DOM.el('div', { class: 'lore-nav-header no-children' }, navLink);
          currentH2Item = DOM.el('li', { class: 'lore-nav-item-h2' }, headerWrapper);
          rootList.appendChild(currentH2Item);
        }
        
      } else if (heading.tagName === 'H3') {
        if (!currentH2SubList) {
          // If H3 appears before any H2, attach to root level
          rootList.appendChild(DOM.el('li', { class: 'lore-nav-item-h3 root-h3' }, navLink));
        } else {
          currentH2SubList.appendChild(DOM.el('li', { class: 'lore-nav-item-h3' }, navLink));
          
          // Auto-expand parent if deep linking directly happens
          navLink.addEventListener('click', () => {
            if (currentH2SubList.style.display === 'none') {
              currentH2SubList.style.display = 'block';
              const toggleBtn = currentH2SubList.previousElementSibling.querySelector('.lore-nav-toggle');
              if (toggleBtn) toggleBtn.classList.add('expanded');
            }
          });
        }
      }
    });
  }

  /**
   * Safely parses an HTML container's text nodes to linkify library definitions.
   * Skips interactive items, images, and headers to prevent structural breakage.
   * @param {HTMLElement} element - Parent container node
   * @param {Object} libraryData - Key-value map from world library.json
   * @param {Function} onTermClick - Callback fired when a term subpage link is clicked
   */
  static injectLibraryTerms(element, libraryData, onTermClick) {
    if (!libraryData || Object.keys(libraryData).length === 0) return;

    // 1. Create a TreeWalker targeting plain text elements exclusively
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        
        // Reject headings, native markdown links, buttons, and system tags in ancestors
        if (parent.closest('a, img, button, script, style, h1, h2, h3, h4, h5, h6')) {
          return NodeFilter.FILTER_REJECT;
        }
        // Avoid recursive wrapping if already initialized
        if (parent.closest('.library-term-link') || parent.closest('.library-term-wrapper')) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const textNodes = [];
    while (walker.nextNode()) {
      textNodes.push(walker.currentNode);
    }

    // 2. Sort terms by string length descending to avoid partial matches (e.g. "Zenark Corp" vs "Zenark")
    const terms = Object.keys(libraryData).sort((a, b) => b.length - a.length);
    const escapedTerms = terms.map(t => t.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&'));
    const regex = new RegExp(`\\b(${escapedTerms.join('|')})\\b`, 'gi');

    // 3. Batch mutations safely using DocumentFragments
    textNodes.forEach(node => {
      const text = node.nodeValue;
      if (!regex.test(text)) return;

      regex.lastIndex = 0; 
      const fragment = document.createDocumentFragment();
      let lastIndex = 0;
      let match;

      while ((match = regex.exec(text)) !== null) {
        const matchedText = match[0];
        const matchedKey = terms.find(t => t.toLowerCase() === matchedText.toLowerCase()) || matchedText;
        const termInfo = libraryData[matchedKey];

        // Append leading standard text
        if (match.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.substring(lastIndex, match.index)));
        }

        // Construct Library Tooltip Wrapper
        const termSpan = document.createElement('span');
        termSpan.className = 'library-term-wrapper';
        termSpan.setAttribute('data-definition', termInfo.definition);
        
        // Construct Subpage Route Anchor Element
        const termLink = document.createElement('a');
        termLink.className = 'library-term-link';
        termLink.href = '#';
        termLink.textContent = matchedText;
        
        termLink.addEventListener('click', (e) => {
          e.preventDefault();
          if (termInfo.subpage) {
            onTermClick(termInfo.subpage, matchedKey);
          }
        });

        termSpan.appendChild(termLink);
        fragment.appendChild(termSpan);
        lastIndex = regex.lastIndex;
      }

      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.substring(lastIndex)));
      }

      node.parentNode.replaceChild(fragment, node);
    });
  }
}
export default LoreService;

