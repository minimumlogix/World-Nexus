/* js/ui/ToolCard.js */
import { DOM } from '../utils/DOM.js';
import { lazyLoader } from './LazyLoader.js';

export class ToolCard {
  /**
   * Generates a fully interactive Tool Card DOM node.
   * @param {Object} tool - Tool metadata object
   * @returns {HTMLElement}
   */
  static render(tool) {
    // Open Tool button — compact, appears only on hover
    const openBtn = DOM.el('a', {
      href: tool.link,
      class: 'btn btn-accent bot-chat-btn tool-open-btn',
      target: '_blank',
      rel: 'noopener',
      onclick: (e) => {
        e.stopPropagation();
      }
    },
      DOM.el('i', { class: 'bi bi-box-arrow-up-right' }),
      ' Open Tool'
    );

    // Build header elements (stat/type chip + Beta badge)
    const badgeRow = DOM.el('div', { class: 'card-header' },
      DOM.el('span', { class: 'bot-stat-chip' },
        DOM.el('i', { class: 'bi bi-tools' }),
        ' Tool'
      ),
      tool.ifbeta ? DOM.el('span', { 
        class: 'card-badge-top beta-badge',
        style: {
          color: '#fef08a',
          borderColor: 'rgba(234, 179, 8, 0.4)',
          background: 'rgba(234, 179, 8, 0.15)',
          boxShadow: '0 0 8px rgba(234, 179, 8, 0.2)',
          fontSize: '0.62rem',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }
      }, 'BETA') : DOM.el('span')
    );

    // Assemble tool card container
    const cardElement = DOM.el('article', {
      class: 'nexus-card tool-card gpu-accelerated',
      style: {
        '--accent': '#eab308', // Gold theme accent for tools
        '--accent-rgb': '234, 179, 8'
      },
      tabindex: '0',
      'aria-label': `Open ${tool.name} tool`,
      onclick: () => {
        window.open(tool.link, '_blank', 'noopener');
      },
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cardElement.click();
        }
      }
    },
      // 1. Cover Layer
      DOM.el('div', { class: 'card-image-layer' },
        DOM.el('img', {
          class: 'card-bg-image',
          'data-src': tool.image,
          alt: `${tool.name} screenshot`
        })
      ),
      // 2. Gradient Overlay for readability
      DOM.el('div', { class: 'card-gradient-overlay' }),
      // 3. Header Row
      badgeRow,
      // 4. Body Column
      DOM.el('div', { class: 'card-body' },
        DOM.el('div', { class: 'card-title' },
          DOM.el('h3', {}, tool.name),
          DOM.el('div', { class: 'card-title-divider' })
        ),
        DOM.el('p', { class: 'card-description' }, tool.intro),
        // Action CTA — slides up on hover
        DOM.el('div', { class: 'bot-card-actions' }, openBtn)
      )
    );

    // Register backdrop cover loader observer
    const bgImage = cardElement.querySelector('.card-bg-image');
    lazyLoader.observe(bgImage);

    return cardElement;
  }
}

export default ToolCard;
