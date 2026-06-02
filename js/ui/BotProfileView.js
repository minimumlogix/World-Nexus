/* js/ui/BotProfileView.js
   Reusable UI component for rendering a bot's full profile view.
   Used by both BotPage.js (standalone view) and WorldPage.js (inline view).
*/
import { DOM } from '../utils/DOM.js';
import { LoreService } from '../services/LoreService.js';
import { BotCard } from './BotCard.js';
import { router } from '../core/Router.js';

export class BotProfileView {
  /**
   * @param {Object} bot - The bot data object
   * @param {Object} world - The parent world object
   * @param {Array} siblings - All bots in the same world
   */
  constructor(bot, world, siblings) {
    this.bot = bot;
    this.world = world;
    this.relatedBots = siblings.filter(b => b.id !== bot.id);
    this.containerEl = null;
    this.drawerAnimFrame = null;
    this.loreNav = null;
    this.loreContentNode = null;
  }

  /**
   * Builds the DOM elements for the bot profile.
   * @returns {HTMLElement} The root div element containing the bot profile content
   */
  render() {
    // 1. Relations / Social Ties
    const relations = this.bot.metadata?.relations || {};
    const relationKeys = Object.keys(relations);
    let tiesContainer = null;
    
    if (relationKeys.length > 0) {
      const avatarsList = relationKeys.map(name => {
        const relatedBot = this.relatedBots.find(b => b.name.toLowerCase() === name.toLowerCase());
        if (relatedBot && relatedBot.avatar) {
          return DOM.el('a', {
            href: `#/bot/${relatedBot.id}`,
            class: 'bot-tie-avatar-link',
            title: `${name} (${relations[name]})`
          },
            DOM.el('img', { src: relatedBot.avatar, class: 'bot-tie-avatar', alt: name })
          );
        } else {
          return DOM.el('div', { 
            class: 'bot-tie-avatar-fallback', 
            title: `${name} (${relations[name]})` 
          }, name.charAt(0).toUpperCase());
        }
      });
      tiesContainer = DOM.el('div', { class: 'bot-hero-ties' }, ...avatarsList);
    }

    // 2. Abilities tags
    const abilities = this.bot.metadata?.abilities || [];
    const abilitiesPills = abilities.map(ability => 
      DOM.el('span', { class: 'tag tag-accent bot-tag-pill' }, ability)
    );

    // 3. Action buttons
    const actionsRow = DOM.el('div', { class: 'bot-hero-actions-redesign' },
      DOM.el('a', {
        href: this.bot.chatEndpoint || '#',
        class: `btn ${this.bot.chatEndpoint ? 'btn-accent' : 'btn-disabled'} bot-hero-chat-btn`,
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
        target: this.bot.chatEndpoint ? '_blank' : '_self',
        rel: 'noopener',
        onclick: (e) => {
          if (!this.bot.chatEndpoint) e.preventDefault();
        }
      }, 
        DOM.el('i', { class: 'bi bi-chat-dots-fill' }),
        'Start Chat'
      ),
      DOM.el('button', {
        class: 'btn btn-secondary',
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
        onclick: () => router.navigate(`/world/${this.world.id}`)
      }, 
        DOM.el('i', { class: 'bi bi-globe' }),
        'Open World'
      ),
      DOM.el('button', {
        class: 'btn btn-secondary',
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
        onclick: (e) => {
          navigator.clipboard.writeText(window.location.href);
          const btn = e.currentTarget;
          const orig = btn.innerHTML;
          btn.innerHTML = '<i class="bi bi-check2"></i> Copied!';
          setTimeout(() => { if (btn) btn.innerHTML = orig; }, 2000);
        }
      }, 
        DOM.el('i', { class: 'bi bi-share' }),
        'Share Profile'
      )
    );

    // 4. Collapsible Chronicles Header Actions
    const iconBtnStyle = { 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'center', 
      width: '32px', 
      height: '32px', 
      padding: '0' 
    };

    const shareButton = DOM.el('button', {
      class: 'btn btn-secondary',
      title: 'Share Profile',
      style: iconBtnStyle,
      onclick: (e) => {
        navigator.clipboard.writeText(window.location.href);
        const btn = e.currentTarget;
        const orig = btn.innerHTML;
        btn.innerHTML = '<i class="bi bi-check2"></i>';
        setTimeout(() => { if (btn) btn.innerHTML = orig; }, 2000);
      }
    }, DOM.el('i', { class: 'bi bi-share' }));

    const collapseIcon = DOM.el('i', {
      class: 'bi bi-chevron-up',
      style: { transition: 'transform 0.3s ease', display: 'inline-block' }
    });

    const collapseButton = DOM.el('button', {
      class: 'btn btn-secondary lore-collapse-btn',
      title: 'Toggle Log',
      style: iconBtnStyle,
      onclick: () => {
        const lorePanel = document.getElementById('bot-lore-panel');
        if (lorePanel) {
          lorePanel.classList.toggle('collapsed');
          const isCollapsed = lorePanel.classList.contains('collapsed');
          collapseIcon.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      }
    }, collapseIcon);

    const headerActions = DOM.el('div', { class: 'lore-header-actions', style: { display: 'flex', gap: '8px' } }, 
      shareButton, 
      collapseButton
    );

    // 5. Index Drawer
    const drawerToggleIcon = DOM.el('i', {
      class: 'bi bi-chevron-right'
    });

    const drawerBtn = DOM.el('div', {
      class: 'lore-sidebar-toggle-btn',
      onclick: (e) => {
        e.stopPropagation();
        const wrapper = document.getElementById('lore-sidebar-drawer');
        if (wrapper) wrapper.classList.toggle('active');
      }
    }, drawerToggleIcon);

    this.loreNav = DOM.el('ul');
    this.loreContentNode = DOM.el('div', { class: 'lore-grid' });

    const sidebarDrawer = DOM.el('div', {
      id: 'lore-sidebar-drawer',
      class: 'lore-sidebar-wrapper',
      onmouseenter: () => {
        const wrapper = document.getElementById('lore-sidebar-drawer');
        if (wrapper) wrapper.classList.add('hover-active');
      },
      onmouseleave: () => {
        const wrapper = document.getElementById('lore-sidebar-drawer');
        if (wrapper) wrapper.classList.remove('hover-active');
      }
    },
      DOM.el('aside', { class: 'lore-sidebar' },
        DOM.el('h4', { class: 'lore-sidebar-title' }, 'Index Sections'),
        this.loreNav
      ),
      drawerBtn
    );

    const sidebarPositioner = DOM.el('div', {
      id: 'lore-sidebar-positioner',
      class: 'lore-sidebar-positioner'
    }, sidebarDrawer);

    // 6. Related Bots grid
    const relatedBotsContainer = DOM.el('div', { class: 'related-bots-grid' });
    if (this.relatedBots.length > 0) {
      this.relatedBots.forEach(rb => relatedBotsContainer.appendChild(BotCard.render(rb)));
    } else {
      relatedBotsContainer.appendChild(DOM.el('p', { class: 'related-bots-empty' }, 'No other intelligent entities registered in this world vector.'));
    }

    // Assemble profile body
    this.containerEl = DOM.el('div', { class: 'bot-profile-body fade-in-up-page' },
      // 1. Hero Block
      DOM.el('section', { class: 'bot-hero-redesign' },
        DOM.el('div', { 
          class: 'bot-hero-portrait-card',
          style: { backgroundImage: `url(${this.bot.cardImage})` }
        },
          DOM.el('div', { class: 'hero-background-overlay' }),
          DOM.el('h1', { class: 'bot-hero-name' }, this.bot.name.toUpperCase())
        ),
        DOM.el('div', { class: 'bot-hero-tagline' }, (this.bot.metadata?.character || '').toUpperCase()),
        DOM.el('p', {
          class: 'bot-hero-affiliation-link',
          onclick: () => router.navigate(`/world/${this.world.id}`)
        }, 'AFFILIATED WORLD: ', DOM.el('strong', {}, this.world.title.toUpperCase())),
        DOM.el('div', { class: 'bot-hero-desc-card' },
          DOM.el('p', { class: 'bot-hero-description-text' }, this.bot.description)
        ),
        abilitiesPills.length > 0 ? DOM.el('div', { class: 'tags-list', style: { marginTop: '12px', justifyContent: 'center' } }, ...abilitiesPills) : null,
        actionsRow,
        tiesContainer
      ),

      // 2. Collapsible Chronicle Logs
      DOM.el('section', { id: 'bot-lore-panel', class: 'world-lore-panel bot-lore-panel' },
        DOM.el('div', { class: 'bot-lore-panel-header' },
          DOM.el('h2', {}, 'Entity Background Logs'),
          headerActions
        ),
        sidebarPositioner,
        this.loreContentNode
      ),

      // 3. Related Bots Grid
      DOM.el('section', { class: 'related-bots-section' },
        DOM.el('h2', {}, 'Related Entities in Sector'),
        relatedBotsContainer
      )
    );

    return this.containerEl;
  }

  /**
   * Fetches the markdown logs asynchronously and animates the sidebar drawer.
   */
  async load() {
    try {
      const loreUrl = `${this.world.path}/${this.bot.lore}`;
      const htmlMarkdown = await LoreService.loadLore(loreUrl);
      
      // Clear placeholder and build the structured content
      DOM.clear(this.loreContentNode);
      const contentNode = DOM.el('div', { class: 'lore-body-content' });
      this.loreContentNode.appendChild(contentNode);
      
      LoreService.buildHierarchicalLore(htmlMarkdown, contentNode, this.loreNav);
    } catch (e) {
      console.warn('[BotProfileView] Could not load lore:', e);
      DOM.clear(this.loreContentNode);
      this.loreContentNode.appendChild(
        DOM.el('p', { class: 'error-msg', style: { color: 'var(--text-muted)', fontStyle: 'italic', padding: '24px' } }, 'Failed to retrieve database logs.')
      );
    }

    // Animate Index Drawer positioner
    this._startDrawerAnimation();
  }

  /**
   * Cleans up running animations.
   */
  unload() {
    if (this.drawerAnimFrame) {
      cancelAnimationFrame(this.drawerAnimFrame);
    }
  }

  /**
   * Smooth drawer lerping animation on scroll.
   * @private
   */
  _startDrawerAnimation() {
    let currentY = 0;
    let targetY = 0;
    
    const animateDrawer = () => {
      if (!document.getElementById('lore-sidebar-positioner')) return;
      
      const positioner = document.getElementById('lore-sidebar-positioner');
      const drawer = document.getElementById('lore-sidebar-drawer');
      const panel = document.getElementById('bot-lore-panel');
      
      if (positioner && drawer && panel) {
        const panelRect = panel.getBoundingClientRect();
        const headerOffset = 100; // Sticky header gap
        
        let desiredY = 0;
        if (panelRect.top < headerOffset) {
          desiredY = headerOffset - panelRect.top;
          const maxTranslate = panelRect.height - drawer.offsetHeight - 40;
          if (desiredY > maxTranslate) desiredY = maxTranslate;
        }
        targetY = Math.max(0, desiredY);
        currentY += (targetY - currentY) * 0.08;
        
        if (Math.abs(targetY - currentY) > 0.1) {
          positioner.style.transform = `translateY(${currentY}px)`;
        } else if (currentY !== targetY) {
          currentY = targetY;
          positioner.style.transform = `translateY(${currentY}px)`;
        }
      }
      
      this.drawerAnimFrame = requestAnimationFrame(animateDrawer);
    };
    
    this.drawerAnimFrame = requestAnimationFrame(animateDrawer);
  }
}

export default BotProfileView;
