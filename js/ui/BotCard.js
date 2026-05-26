/* js/ui/BotCard.js */
import { DOM } from '../utils/DOM.js';
import { lazyLoader } from './LazyLoader.js';
import { stateManager } from '../core/StateManager.js';
import { router } from '../core/Router.js';

export class BotCard {
  /**
   * Generates a fully interactive Bot Card DOM node.
   * Shares the same base nexus-card size/structure as WorldCard (parent-child inheritance).
   * @param {Object} bot - Bot details metadata
   * @returns {HTMLElement}
   */
  static render(bot) {
    const isFav = stateManager.isFavorite(bot.id);

    // Dynamic Favoriting indicator button
    const favoriteButton = DOM.el('button', {
      class: `btn btn-secondary bot-fav-btn ${isFav ? 'favorited' : ''}`,
      'aria-label': isFav ? `Remove ${bot.name} from bookmarks` : `Bookmark ${bot.name}`,
      onclick: (e) => {
        e.stopPropagation(); // Avoid card navigation
        stateManager.toggleFavorite(bot.id);
        const active = stateManager.isFavorite(bot.id);
        favoriteButton.innerHTML = active ? '❤️' : '🤍';
        favoriteButton.classList.toggle('favorited', active);
      }
    }, isFav ? '❤️' : '🤍');

    // Create tagged categories — identical CSS classes as WorldCard tags
    const tagsSource = bot.genres || bot.tags || [];
    const tagElements = tagsSource.map(genre =>
      DOM.el('span', { class: 'tag tag-sm' }, genre)
    );

    // Start Chat button — always visible (not just on hover)
    const chatBtn = DOM.el('a', {
      href: bot.chatEndpoint || '#',
      class: 'btn btn-accent bot-chat-btn',
      target: '_blank',
      rel: 'noopener',
      onclick: (e) => {
        e.stopPropagation();
        if (!bot.chatEndpoint) {
          e.preventDefault();
          alert('This agent is currently offline (chat endpoint not configured).');
        }
      }
    },
      DOM.el('i', { class: 'bi bi-chat-dots-fill' }),
      ' Start Chat'
    );

    // Assemble bot card structures — same base nexus-card as WorldCard
    const cardElement = DOM.el('article', {
      class: 'nexus-card bot-card gpu-accelerated',
      tabindex: '0',
      'aria-label': `View details of ${bot.name}`,
      onclick: () => {
        router.navigate(`/bot/${bot.id}`);
      },
      onkeydown: (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          cardElement.click();
        }
      }
    },
      // 1. Hero background illustration (card-image-layer shared with WorldCard)
      DOM.el('div', { class: 'card-image-layer' },
        DOM.el('img', {
          class: 'card-bg-image',
          'data-src': bot.cardImage || bot.avatar,
          alt: `${bot.name} background design`
        })
      ),
      // 2. Ambient gradient overlay (shared)
      DOM.el('div', { class: 'card-gradient-overlay' }),
      // 3. Figma-Style Auto Layout Header Row (shared structure, bot-specific avatar)
      DOM.el('div', { class: 'card-header' },
        // Bot-specific: Large prominent avatar in header (replaces world logo)
        DOM.el('div', { class: 'bot-avatar-container' },
          DOM.el('img', {
            class: 'bot-avatar-image',
            src: bot.avatar,
            alt: `${bot.name} profile avatar`
          })
        ),
        // Bot-specific: stats badge on right
        DOM.el('div', { class: 'card-badge-top' },
          DOM.el('i', { class: 'bi bi-chat-dots-fill', style: { color: 'var(--accent-gold)', fontSize: '0.65rem' } }),
          ` ${bot.chats || 0}`,
          DOM.el('i', { class: 'bi bi-heart-fill', style: { color: '#ef4444', fontSize: '0.65rem', marginLeft: '4px' } }),
          ` ${bot.likes || 0}`
        )
      ),
      // 4. Figma-Style Auto Layout Body Column (shared structure)
      DOM.el('div', { class: 'card-body' },
        DOM.el('div', { class: 'card-title' },
          DOM.el('h3', {}, bot.name || bot.title || 'Unknown Bot'),
          DOM.el('div', { class: 'card-title-divider' })
        ),
        DOM.el('p', { class: 'card-description' }, bot.description || bot.introduce || 'No description available.'),
        DOM.el('div', { class: 'tags-list' }, ...tagElements),
        // 5. Start chat CTA — always visible, part of card body
        DOM.el('div', { class: 'bot-card-actions' },
          chatBtn,
          favoriteButton
        )
      )
    );

    // Register backdrop cover loader observer
    const bgImage = cardElement.querySelector('.card-bg-image');
    lazyLoader.observe(bgImage);

    return cardElement;
  }
}
export default BotCard;
