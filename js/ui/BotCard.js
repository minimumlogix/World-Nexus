/* js/ui/BotCard.js */
import { DOM } from '../utils/DOM.js';
import { lazyLoader } from './LazyLoader.js';
import { router } from '../core/Router.js';
import { stateManager } from '../core/StateManager.js';
import { Modal } from './Modal.js';

export class BotCard {
  /**
   * Generates a fully interactive Bot Card DOM node.
   * Portrait aspect ratio matching the reference character card style.
   * Full-bleed character art, top stats row, hover-only Start Chat CTA.
   * @param {Object} bot - Bot details metadata
   * @returns {HTMLElement}
   */
  static render(bot) {
    // Create tagged categories
    const tagsSource = bot.genres || bot.tags || [];
    const tagElements = tagsSource.map(genre =>
      DOM.el('span', { 
        class: 'tag tag-sm', 
        onclick: (e) => {
          e.stopPropagation();
          const searchInput = document.getElementById('global-search-input');
          if (searchInput) searchInput.value = genre;
          stateManager.setState('searchQuery', genre);
        }
      }, genre)
    );

    // Start Chat button — compact, appears only on hover
    const chatBtn = DOM.el('a', {
      href: bot.chatEndpoint || '#',
      class: 'btn btn-accent bot-chat-btn',
      target: '_blank',
      rel: 'noopener',
      onclick: (e) => {
        e.stopPropagation();
        if (!bot.chatEndpoint) {
          e.preventDefault();
          alert('This character is currently offline (chat endpoint not configured).');
        }
      }
    },
      DOM.el('i', { class: 'bi bi-chat-dots-fill' }),
      ' Chat'
    );

    const isJoylandOnly = bot.id && !bot.worldId && bot.chatEndpoint && bot.chatEndpoint.includes('joyland.ai');

    // Assemble portrait bot card — full-bleed art, stat chips at top, content at bottom
    const cardElement = DOM.el('article', {
      class: 'nexus-card bot-card gpu-accelerated',
      style: {
        '--accent': bot.worldAccent || '',
        '--accent-rgb': bot.worldAccentRgb || ''
      },
      tabindex: '0',
      'aria-label': isJoylandOnly ? `Chat with ${bot.name || 'Unnamed Bot'} on Joyland` : `View details of ${bot.name || bot.title || 'Unknown Bot'}`,
      onclick: () => {
        if (!bot.lore) {
          Modal.show('System Alert', 'Lore not available.');
        } else {
          if (isJoylandOnly) {
            window.open(bot.chatEndpoint, '_blank', 'noopener');
          } else {
            router.navigate(`/bot/${bot.id}`);
          }
        }
      },
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cardElement.click();
        }
      }
    },
      // 1. Hero background — full-bleed character portrait
      DOM.el('div', { class: 'card-image-layer' },
        DOM.el('img', {
          class: 'card-bg-image',
          'data-src': bot.cardImage || bot.avatar,
          alt: `${bot.name} character portrait`
        })
      ),
      // 2. Strong bottom gradient for text legibility
      DOM.el('div', { class: 'card-gradient-overlay' }),
      // 3. Top stats row: chat count (left) + like count (right)
      DOM.el('div', { class: 'card-header' },
        DOM.el('span', { class: 'bot-stat-chip' },
          DOM.el('i', { class: 'bi bi-chat-dots-fill' }),
          ` ${bot.chats || 0}`
        ),
        DOM.el('span', { class: 'bot-stat-chip bot-stat-chip--likes' },
          DOM.el('i', { class: 'bi bi-heart-fill' }),
          ` ${bot.likes || 0}`
        )
      ),
      // 4. Bottom content: name, description, tags, hover-only chat CTA
      DOM.el('div', { class: 'card-body' },
        DOM.el('div', { class: 'card-title' },
          DOM.el('h3', {}, bot.name || bot.title || 'Unknown Bot'),
          DOM.el('div', { class: 'card-title-divider' })
        ),
        DOM.el('p', { class: 'card-description' }, bot.description || bot.introduce || 'No description available.'),
        DOM.el('div', { class: 'tags-list' }, ...tagElements),
        // Chat CTA — slides in on hover
        DOM.el('div', { class: 'bot-card-actions' }, chatBtn)
      )
    );

    // Register backdrop cover loader observer
    const bgImage = cardElement.querySelector('.card-bg-image');
    lazyLoader.observe(bgImage);

    return cardElement;
  }

  /**
   * Generates a skeleton loading placeholder Bot Card DOM node.
   * @returns {HTMLElement}
   */
  static renderSkeleton() {
    return DOM.el('div', { class: 'nexus-card bot-card skeleton-card gpu-accelerated' },
      DOM.el('div', { class: 'skeleton-shimmer' }),
      DOM.el('div', { class: 'card-header' },
        DOM.el('span', { class: 'skeleton-chip' }),
        DOM.el('span', { class: 'skeleton-chip' })
      ),
      DOM.el('div', { class: 'card-body' },
        DOM.el('div', { class: 'skeleton-line skeleton-title' }),
        DOM.el('div', { class: 'skeleton-line skeleton-description-1' }),
        DOM.el('div', { class: 'skeleton-line skeleton-description-2' }),
        DOM.el('div', { class: 'tags-list' },
          DOM.el('span', { class: 'skeleton-tag' }),
          DOM.el('span', { class: 'skeleton-tag' })
        )
      )
    );
  }
}
export default BotCard;
