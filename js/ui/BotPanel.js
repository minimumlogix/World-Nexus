/* js/ui/BotPanel.js
   Renders the bot profile as a fixed overlay panel below the main header,
   instead of navigating to a new full page. Invoked by WorldPage when a bot
   card is clicked while a world page is active.
*/
import { DOM } from '../utils/DOM.js';
import { LoreService } from '../services/LoreService.js';
import { BotCard } from './BotCard.js';
import { router } from '../core/Router.js';

export class BotPanel {
  /**
   * @param {Function} onClose - Callback fired after the panel finishes closing
   */
  constructor(onClose) {
    this.onClose = onClose;
    this.bot = null;
    this.world = null;
    this.relatedBots = [];
    this.panelEl = null;
    this.drawerAnimFrame = null;
    this._escHandler = null;
    this._isOpen = false;
    this._contentLoaded = false;
    this._rawMarkdown = null;
  }

  /**
   * Populate data from the parent WorldPage context (no extra fetching needed).
   * @param {Object} bot - The bot data object
   * @param {Object} world - The parent world data object
   * @param {Array}  siblings - All bots in the same world
   */
  setData(bot, world, siblings) {
    this.bot = bot;
    this.world = world;
    this.relatedBots = siblings.filter(b => b.id !== bot.id);
  }

  /**
   * Mounts the panel into the container and begins the entrance animation.
   * @param {HTMLElement} container - Usually #app-root
   */
  mount(container) {
    // Remove any stale panel from a previous open
    const stale = container.querySelector('.bot-inline-panel');
    if (stale) stale.remove();

    this.panelEl = this._buildPanel();
    container.appendChild(this.panelEl);
    this._isOpen = true;

    // Freeze world page scroll and store scrollbar width to prevent background layout shift
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    if (scrollbarWidth > 0) {
      document.body.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
    } else {
      document.body.style.setProperty('--scrollbar-width', '0px');
    }
    document.body.classList.add('bot-panel-open');
    document.title = `${this.bot.name} - ${this.world.title} - World Nexus`;

    // Trigger entrance animation on next two frames so CSS transition fires
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (this.panelEl) {
          this.panelEl.classList.add('bot-inline-panel--visible');
        }
      });
    });

    // Escape key to close
    this._escHandler = (e) => { if (e.key === 'Escape') this._triggerClose(); };
    document.addEventListener('keydown', this._escHandler);

    // Load async content (lore markdown)
    this._loadLore();

    // Start sidebar drawer lerp animation
    this._startDrawerAnimation();
  }

  /**
   * Animate out and remove the panel from DOM.
   */
  close() {
    if (!this.panelEl || !this._isOpen) return;
    this._isOpen = false;

    this.panelEl.classList.remove('bot-inline-panel--visible');
    this.panelEl.classList.add('bot-inline-panel--closing');

    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }

    if (this.drawerAnimFrame) {
      cancelAnimationFrame(this.drawerAnimFrame);
      this.drawerAnimFrame = null;
    }

    document.body.classList.remove('bot-panel-open');
    document.body.style.removeProperty('--scrollbar-width');

    // Remove after transition completes (matches CSS --panel-transition duration)
    setTimeout(() => {
      if (this.panelEl) {
        this.panelEl.remove();
        this.panelEl = null;
      }
      if (this.onClose) this.onClose();
    }, 380);
  }

  isOpen() {
    return this._isOpen;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: build DOM
  // ─────────────────────────────────────────────────────────────────────────

  _buildPanel() {
    const bot = this.bot;
    const world = this.world;

    // ── Breadcrumbs strip ──
    const breadcrumbsBar = DOM.el('div', { class: 'bot-panel-breadcrumbs' },
      DOM.el('div', { class: 'bot-panel-breadcrumbs-inner' },
        DOM.el('nav', { class: 'breadcrumbs-nav', 'aria-label': 'Breadcrumb' },
          DOM.el('ol', { class: 'breadcrumbs-list' },
            DOM.el('li', { class: 'breadcrumb-item' },
              DOM.el('a', { href: '#/', class: 'breadcrumb-link' }, 'Home')
            ),
            DOM.el('li', { class: 'breadcrumb-divider' }, '›'),
            DOM.el('li', { class: 'breadcrumb-item' },
              DOM.el('a', {
                href: `#/world/${world.id}`,
                class: 'breadcrumb-link',
                onclick: (e) => { e.preventDefault(); this._triggerClose(); }
              }, world.title)
            ),
            DOM.el('li', { class: 'breadcrumb-divider' }, '›'),
            DOM.el('li', { class: 'breadcrumb-item' },
              DOM.el('span', { class: 'breadcrumb-current', 'aria-current': 'page' }, bot.name)
            )
          )
        ),
        // Close / back button
        DOM.el('button', {
          class: 'bot-panel-close-btn',
          title: 'Back to World',
          'aria-label': 'Close bot panel',
          onclick: () => this._triggerClose()
        },
          DOM.el('i', { class: 'bi bi-arrow-left' }),
          ' Back'
        )
      )
    );

    // ── Relations / Social Ties ──
    const relations = bot.relations || {};
    const relationKeys = Object.keys(relations);
    let tiesContainer = null;

    if (relationKeys.length > 0) {
      const avatarsList = relationKeys.map(name => {
        const relatedBot = this.relatedBots.find(b => b.name.toLowerCase() === name.toLowerCase());
        if (relatedBot && relatedBot.avatar) {
          return DOM.el('a', {
            href: `#/bot/${relatedBot.id}`,
            class: 'bot-tie-avatar-link',
            title: `${name} (${relations[name]})`,
            onclick: (e) => {
              e.preventDefault();
              router.navigate(`/bot/${relatedBot.id}`);
            }
          },
            DOM.el('img', { src: relatedBot.avatar, class: 'bot-tie-avatar', alt: name })
          );
        }
        return DOM.el('div', {
          class: 'bot-tie-avatar-fallback',
          title: `${name} (${relations[name]})`
        }, name.charAt(0).toUpperCase());
      });
      tiesContainer = DOM.el('div', { class: 'bot-hero-ties' }, ...avatarsList);
    }

    // ── Abilities tags ──
    const abilities = bot.abilities || [];
    const abilitiesPills = abilities.map(a =>
      DOM.el('span', { class: 'tag tag-accent bot-tag-pill' }, a)
    );

    // ── Action Buttons ──
    const actionsRow = DOM.el('div', { class: 'bot-hero-actions-redesign' },
      DOM.el('a', {
        href: bot.chatEndpoint || '#',
        class: `btn ${bot.chatEndpoint ? 'btn-accent' : 'btn-disabled'} bot-hero-chat-btn`,
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
        target: bot.chatEndpoint ? '_blank' : '_self',
        rel: 'noopener',
        onclick: (e) => { if (!bot.chatEndpoint) e.preventDefault(); }
      },
        DOM.el('i', { class: 'bi bi-chat-dots-fill' }),
        'Start Chat'
      ),
      DOM.el('button', {
        class: 'btn btn-secondary',
        style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
        onclick: () => this._triggerClose()
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

    // ── Collapse / Share header buttons ──
    const collapseIcon = DOM.el('i', {
      class: 'bi bi-chevron-up',
      style: { transition: 'transform 0.3s ease', display: 'inline-block' }
    });

    const iconBtnStyle = { display: 'flex', alignItems: 'center', justifyContent: 'center', width: '32px', height: '32px', padding: '0' };

    const headerActions = DOM.el('div', {
      class: 'lore-header-actions',
      style: { display: 'flex', gap: '8px' }
    },
      DOM.el('button', {
        class: 'btn btn-secondary',
        title: 'Share Profile',
        style: iconBtnStyle,
        onclick: () => navigator.clipboard.writeText(window.location.href)
      },
        DOM.el('i', { class: 'bi bi-share' })
      ),
      DOM.el('button', {
        class: 'btn btn-secondary',
        title: 'Copy Lore Text',
        style: iconBtnStyle,
        onclick: async (e) => {
          const btn = e.currentTarget;
          const orig = btn.innerHTML;
          try {
            const text = this._getCleanLoreText();
            if (text) {
              await navigator.clipboard.writeText(text);
              btn.innerHTML = '<i class="bi bi-check2"></i>';
            } else {
              btn.innerHTML = '<i class="bi bi-x"></i>';
            }
          } catch {
            btn.innerHTML = '<i class="bi bi-x"></i>';
          }
          setTimeout(() => { if (btn) btn.innerHTML = orig; }, 2000);
        }
      },
        DOM.el('i', { class: 'bi bi-copy' })
      ),
      DOM.el('button', {
        class: 'btn btn-secondary lore-collapse-btn',
        title: 'Toggle Log',
        style: iconBtnStyle,
        onclick: (e) => {
          const lorePanel = this.panelEl?.querySelector('#bot-panel-lore');
          if (lorePanel) {
            lorePanel.classList.toggle('collapsed');
            collapseIcon.style.transform = lorePanel.classList.contains('collapsed')
              ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        }
      }, collapseIcon)
    );

    // ── Lore Sidebar ──
    this._loreNav = DOM.el('ul');
    this._loreContent = DOM.el('div', { class: 'lore-body-content' });

    const drawerToggleIcon = DOM.el('i', {
      class: 'bi bi-chevron-right'
    });

    const sidebarDrawer = DOM.el('div', {
      id: 'bot-panel-sidebar-drawer',
      class: 'lore-sidebar-wrapper',
      onmouseenter: () => sidebarDrawer.classList.add('hover-active'),
      onmouseleave: () => sidebarDrawer.classList.remove('hover-active')
    },
      DOM.el('aside', { class: 'lore-sidebar' },
        DOM.el('h4', { class: 'lore-sidebar-title' }, 'Index Sections'),
        this._loreNav
      ),
      DOM.el('div', {
        class: 'lore-sidebar-toggle-btn',
        onclick: (e) => { e.stopPropagation(); sidebarDrawer.classList.toggle('active'); }
      }, drawerToggleIcon)
    );

    const sidebarPositioner = DOM.el('div', {
      id: 'bot-panel-sidebar-positioner',
      class: 'lore-sidebar-positioner'
    }, sidebarDrawer);

    // ── Related Bots ──
    this._relatedBotsContainer = DOM.el('div', { class: 'related-bots-grid' });
    if (this.relatedBots.length > 0) {
      this.relatedBots.forEach(rb => this._relatedBotsContainer.appendChild(BotCard.render(rb)));
    } else {
      this._relatedBotsContainer.appendChild(
        DOM.el('p', { class: 'related-bots-empty' }, 'No other intelligent entities registered in this world vector.')
      );
    }

    // ── Assemble content area ──
    const contentArea = DOM.el('div', { class: 'bot-panel-content page-container bot-profile-view' },
      // Hero
      DOM.el('section', { class: 'bot-hero-redesign' },
        DOM.el('div', {
          class: 'bot-hero-portrait-card',
          style: { backgroundImage: `url(${bot.cardImage})` }
        },
          DOM.el('div', { class: 'hero-background-overlay' }),
          DOM.el('h1', { class: 'bot-hero-name' }, bot.name.toUpperCase())
        ),
        DOM.el('div', { class: 'bot-hero-tagline' }, (bot.metadata?.character || '').toUpperCase()),
        DOM.el('p', {
          class: 'bot-hero-affiliation-link',
          onclick: () => this._triggerClose()
        }, 'AFFILIATED WORLD: ', DOM.el('strong', {}, world.title.toUpperCase())),
        DOM.el('div', { class: 'bot-hero-desc-card' },
          DOM.el('p', { class: 'bot-hero-description-text' }, bot.description)
        ),
        abilitiesPills.length > 0
          ? DOM.el('div', { class: 'tags-list', style: { marginTop: '12px' } }, ...abilitiesPills)
          : null,
        actionsRow,
        tiesContainer
      ),

      // Lore panel
      DOM.el('section', {
        id: 'bot-panel-lore',
        class: 'world-lore-panel bot-lore-panel'
      },
        DOM.el('div', { class: 'bot-lore-panel-header' },
          DOM.el('h2', {}, 'Entity Background Logs'),
          headerActions
        ),
        sidebarPositioner,
        DOM.el('div', { class: 'lore-grid' }, this._loreContent)
      ),

      // Related bots
      DOM.el('section', { class: 'related-bots-section' },
        DOM.el('h2', {}, 'Related Entities in Sector'),
        this._relatedBotsContainer
      )
    );

    // ── Assemble panel wrapper ──
    const panel = DOM.el('div', { class: 'bot-inline-panel' },
      breadcrumbsBar,
      contentArea
    );

    return panel;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // Private: async operations
  // ─────────────────────────────────────────────────────────────────────────

  async _loadLore() {
    if (!this.bot || !this.world || !this._loreContent) return;
    try {
      this._rawMarkdown = this.bot.rawLoreMarkdown || '';
      const html = LoreService.parseMarkdown(this._rawMarkdown);
      LoreService.buildHierarchicalLore(html, this._loreContent, this._loreNav);
    } catch (e) {
      console.warn('[BotPanel] Could not load lore:', e);
    }
  }

  /**
   * Returns clean lore text: strips image markdown and HTML tags from raw markdown.
   * @returns {string}
   */
  _getCleanLoreText() {
    if (!this._rawMarkdown) return '';
    return this._rawMarkdown
      // Remove image markdown: ![alt](url)
      .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
      // Remove inline HTML tags
      .replace(/<[^>]+>/g, '')
      // Collapse excess blank lines left by removals
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  _startDrawerAnimation() {
    let currentY = 0;
    let targetY = 0;

    const animate = () => {
      if (!document.getElementById('bot-panel-sidebar-positioner')) return;

      const positioner = document.getElementById('bot-panel-sidebar-positioner');
      const drawer = document.getElementById('bot-panel-sidebar-drawer');
      const panel = document.getElementById('bot-panel-lore');

      if (positioner && drawer && panel) {
        const panelRect = panel.getBoundingClientRect();
        const headerOffset = 100;

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
        } else {
          currentY = targetY;
          positioner.style.transform = `translateY(${currentY}px)`;
        }
      }

      this.drawerAnimFrame = requestAnimationFrame(animate);
    };

    this.drawerAnimFrame = requestAnimationFrame(animate);
  }

  _triggerClose() {
    // Navigate to the parent world — App will call closeBotPanel()
    router.navigate(`/world/${this.world.id}`);
  }
}

export default BotPanel;
