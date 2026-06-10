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

    // Purify the markdown to avoid dangerous scripts
    const purifiedMd = this.purifyHtml(md);

    // Preprocess spoilers ||spoiler content|| -> custom HTML
    const processedMd = purifiedMd.replace(/\|\|(.*?)\|\|/g, (match, p1) => {
      return `<span class="spoiler-container" tabindex="0" aria-expanded="false" aria-label="Spoiler. Click to reveal."><span class="spoiler-content">${p1}</span><span class="spoiler-overlay"><span class="spoiler-overlay-inner"><i class="bi bi-eye-fill"></i><span class="spoiler-label">Spoiler</span></span></span></span>`;
    });

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

    return marked.parse(processedMd);
  }

  /**
   * Purifies raw HTML/Markdown content to prevent XSS script executions.
   */
  static purifyHtml(html) {
    if (!html) return '';
    
    // Remove all script tags (and their contents) case-insensitively
    let clean = html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    
    // Remove inline event handlers on any tag (e.g. onload, onerror, onclick, etc.)
    clean = clean.replace(/\s\bon[a-zA-Z]+\s*=\s*(["'])(.*?)\1/gi, '');
    clean = clean.replace(/\s\bon[a-zA-Z]+\s*=\s*([^\s>]+)/gi, '');
    
    // Remove javascript: and data: javascript protocols in href/src attributes
    clean = clean.replace(/(href|src)\s*=\s*(["'])javascript:(.*?)\2/gi, '');
    clean = clean.replace(/(href|src)\s*=\s*([^\s>]+javascript:.*?)/gi, '');

    return clean;
  }

  static buildHierarchicalLore(htmlContent, contentNode, navNode, bot = null) {
    contentNode.innerHTML = htmlContent;

    // Arrange headings into card wrappers
    const children = contentNode.children ? Array.from(contentNode.children) : [];
    contentNode.innerHTML = '';

    let currentCard = null;
    let skipContent = false;

    children.forEach(child => {
      if (child.tagName === 'H1') return; // Skip H1 to avoid duplicate title

      if (child.tagName === 'H2') {
        const headingText = child.textContent.trim();
        currentCard = DOM.el('div', { class: 'lore-card', 'data-section': headingText });
        contentNode.appendChild(currentCard);
        currentCard.appendChild(child);

        if (headingText === 'Roleplay Examples' && bot) {
          skipContent = true;
          const rawExamples = bot.loreSections ? bot.loreSections['Roleplay Examples'] : '';
          if (rawExamples) {
            const messages = LoreService.parseRoleplayExamples(rawExamples, bot);
            const chatEl = LoreService.renderRoleplayChat(messages, bot);
            currentCard.appendChild(chatEl);
          }
        } else if (headingText === 'Roleplay Intro - Dialogue & Narration' && bot) {
          const rawIntro = bot.loreSections ? bot.loreSections['Roleplay Intro - Dialogue & Narration'] : '';
          const hasVnMarkup = rawIntro.trim().startsWith('```') || rawIntro.trim().startsWith('<');
          if (hasVnMarkup) {
            skipContent = true;
            let stripped = rawIntro.trim();
            if (stripped.startsWith('```')) {
              const secondLineIndex = stripped.indexOf('\n');
              if (secondLineIndex !== -1) {
                stripped = stripped.substring(secondLineIndex + 1);
              } else {
                stripped = stripped.substring(3);
              }
            }
            if (stripped.endsWith('```')) {
              stripped = stripped.substring(0, stripped.length - 3);
            }
            stripped = stripped.trim();

            const purified = LoreService.purifyHtml(stripped);
            let formatted = purified
              .replace(/\{\{char\}\}/g, bot.name)
              .replace(/\{\{user\}\}/g, 'User')
              .replace(/\*(.*?)\*/g, '<em class="chat-action">*$1*</em>');

            const introEl = DOM.el('div', { class: 'vn-intro-container' });
            introEl.innerHTML = formatted;
            currentCard.appendChild(introEl);
          } else {
            skipContent = false;
          }
        } else {
          skipContent = false;
        }
      } else {
        if (!currentCard) {
          currentCard = DOM.el('div', { class: 'lore-card' });
          contentNode.appendChild(currentCard);
        }
        if (!skipContent) {
          currentCard.appendChild(child);
        }
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
    this.initSpoilers(contentNode);
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

  /**
   * Initializes all spoiler containers within the root element.
   * Uses a ResizeObserver to dynamically determine if the spoiler label fits.
   */
  static initSpoilers(root = document) {
    const spoilers = root.querySelectorAll('.spoiler-container');
    const spoilerObserver = new ResizeObserver((entries) => {
      for (let entry of entries) {
        const spoiler = entry.target;
        if (spoiler.classList.contains('revealed')) continue;
        const width = entry.contentRect.width;
        if (width < 75) {
          spoiler.classList.add('spoiler-short');
        } else {
          spoiler.classList.remove('spoiler-short');
        }
      }
    });

    spoilers.forEach(spoiler => {
      if (!spoiler.dataset.spoilerBound) {
        spoiler.dataset.spoilerBound = 'true';
        spoilerObserver.observe(spoiler);

        spoiler.addEventListener('click', () => {
          spoiler.classList.add('revealed');
          spoiler.setAttribute('aria-expanded', 'true');
          spoiler.removeAttribute('tabindex');
          spoilerObserver.unobserve(spoiler);
        });

        spoiler.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            spoiler.click();
          }
        });
      }
    });
  }

  /**
   * Splits a raw Markdown string into sections based on H2 (##) headings.
   */
  static parseMarkdownSections(md) {
    if (!md) return {};
    const sections = {};
    const lines = md.split(/\r?\n/);
    let currentHeader = null;
    let currentContentLines = [];

    for (let line of lines) {
      if (line.startsWith('## ')) {
        if (currentHeader) {
          sections[currentHeader] = currentContentLines.join('\n').trim();
        }
        currentHeader = line.slice(3).trim();
        currentContentLines = [];
      } else {
        if (currentHeader !== null) {
          currentContentLines.push(line);
        }
      }
    }
    if (currentHeader) {
      sections[currentHeader] = currentContentLines.join('\n').trim();
    }
    return sections;
  }

  /**
   * Extracts list items from the "Abilities" raw Markdown section.
   */
  static extractAbilities(sections) {
    const raw = sections["Abilities"] || "";
    const matches = raw.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/gm) || [];
    return matches.map(m => m.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').trim());
  }

  /**
   * Extracts relationship mappings from the "Relations" raw Markdown section.
   */
  static extractRelations(sections) {
    const raw = sections["Relations"] || "";
    const matches = raw.match(/^\s*(?:[-*+]|\d+\.)\s+(.+)$/gm) || [];
    const relations = {};
    matches.forEach(m => {
      const text = m.replace(/^\s*(?:[-*+]|\d+\.)\s+/, '').trim();
      const splitMatch = text.match(/^([^:\-–—]+)[:\-–—](.+)$/);
      if (splitMatch) {
        relations[splitMatch[1].trim()] = splitMatch[2].trim();
      } else if (text) {
        relations[text] = "";
      }
    });
    return relations;
  }

  /**
   * Asynchronously fetches a bot's Markdown lore and extracts section data.
   */
  static async loadBotLore(bot, worldPath) {
    if (bot.loreSections) return bot.loreSections;
    try {
      const loreUrl = `${worldPath}/${bot.lore}`;
      const response = await fetch(loreUrl);
      if (!response.ok) throw new Error(`HTTP status ${response.status}`);
      const rawMarkdown = await response.text();
      bot.rawLoreMarkdown = rawMarkdown;
      bot.loreSections = this.parseMarkdownSections(rawMarkdown);

      if (bot.scenario) {
        try {
          const scenarioUrl = `${worldPath}/${bot.scenario}`;
          const scenarioResponse = await fetch(scenarioUrl);
          if (scenarioResponse.ok) {
            const scenarioMarkdown = await scenarioResponse.text();
            bot.rawScenarioMarkdown = scenarioMarkdown;
            const scenarioSections = this.parseMarkdownSections(scenarioMarkdown);
            Object.assign(bot.loreSections, scenarioSections);
          }
        } catch (scenarioErr) {
          console.warn(`[LoreService] Failed to load scenario for bot ${bot.id}:`, scenarioErr);
        }
      }

      bot.abilities = this.extractAbilities(bot.loreSections);
      bot.relations = this.extractRelations(bot.loreSections);
    } catch (err) {
      console.warn(`[LoreService] Failed to load lore for bot ${bot.id}:`, err);
      bot.rawLoreMarkdown = "";
      bot.loreSections = {};
      bot.abilities = [];
      bot.relations = {};
    }
    return bot.loreSections;
  }

  /**
   * Splits a roleplay examples raw section into structured message objects.
   */
  static parseRoleplayExamples(rawExamples, bot) {
    if (!rawExamples) return [];
    const lines = rawExamples.split(/\r?\n/);
    const messages = [];
    for (let line of lines) {
      line = line.trim();
      if (!line || line === 'START_OF_DIALOG' || line === 'END_OF_DIALOG') {
        continue;
      }
      
      const colonIndex = line.indexOf(':');
      if (colonIndex !== -1) {
        const senderPart = line.substring(0, colonIndex).trim();
        const contentPart = line.substring(colonIndex + 1).trim();
        
        const isUser = /^(user|\{\{user\}\})$/i.test(senderPart);
        messages.push({
          sender: isUser ? 'user' : 'char',
          senderName: isUser ? 'User' : (bot.name || senderPart),
          content: contentPart
        });
      } else {
        if (messages.length > 0) {
          messages[messages.length - 1].content += '\n' + line;
        } else {
          messages.push({
            sender: 'char',
            senderName: bot.name,
            content: line
          });
        }
      }
    }
    return messages;
  }

  static renderRoleplayChat(messages, bot) {
    const chatContainer = DOM.el('div', { class: 'roleplay-chat-container' });

    messages.forEach(msg => {
      let processedContent = msg.content
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
      
      processedContent = processedContent.replace(/\{\{char\}\}/g, bot.name);
      processedContent = processedContent.replace(/\{\{user\}\}/g, 'User');
      processedContent = processedContent.replace(/\*(.*?)\*/g, '<em class="chat-action">*$1*</em>');
      processedContent = processedContent.replace(/\n/g, '<br/>');

      if (msg.sender === 'user') {
        const textNode = DOM.el('div', { class: 'chat-bubble-text' });
        textNode.innerHTML = processedContent;

        const bubble = DOM.el('div', { class: 'chat-bubble user-bubble' }, textNode);
        const row = DOM.el('div', { class: 'chat-row user-row' }, bubble);
        chatContainer.appendChild(row);
      } else {
        const avatarEl = bot.avatar 
          ? DOM.el('img', { src: bot.avatar, class: 'chat-avatar', alt: bot.name })
          : DOM.el('div', { class: 'chat-avatar chat-avatar-fallback' }, bot.name.charAt(0).toUpperCase());

        const nameEl = DOM.el('span', { class: 'chat-sender-name' }, bot.name);
        const headerEl = DOM.el('div', { class: 'chat-message-header' }, nameEl);
        
        const textNode = DOM.el('div', { class: 'chat-bubble-text' });
        textNode.innerHTML = processedContent;

        const bubble = DOM.el('div', { class: 'chat-bubble character-bubble' }, textNode);
        const contentWrap = DOM.el('div', { class: 'chat-message-content-wrap' }, headerEl, bubble);
        const row = DOM.el('div', { class: 'chat-row character-row' }, avatarEl, contentWrap);
        chatContainer.appendChild(row);
      }
    });

    return chatContainer;
  }
}
export default LoreService;

