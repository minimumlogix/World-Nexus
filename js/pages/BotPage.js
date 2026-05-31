/* js/pages/BotPage.js */
import { DOM } from '../utils/DOM.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { LoreService } from '../services/LoreService.js';
import { ThemeLoader } from '../ui/ThemeLoader.js';
import { SvgAnimator } from '../ui/SvgAnimator.js';
import { BotCard } from '../ui/BotCard.js';
import { Breadcrumbs } from '../ui/Breadcrumbs.js';
import { router } from '../core/Router.js';

export class BotPage {
  /**
   * Controller for displaying Bot details profile.
   * @param {HTMLElement} appRoot - App insertion parent node
   * @param {string} botId - Unique bot identifier
   */
  constructor(appRoot, botId) {
    this.appRoot = appRoot;
    this.botId = botId;
    this.bot = null;
    this.world = null;
    this.relatedBots = [];
  }

  /**
   * Gathers bot data, loads parent world stylesheets, compiles metadata key-values, renders Markdown lore, and displays recommended bots.
   */
  async load() {
    // 1. Resolve bot details
    const allBots = await BotService.getAllBots();
    this.bot = allBots.find(b => b.id === this.botId);

    if (!this.bot) {
      this.render404();
      return;
    }

    // 2. Resolve parent world details
    this.world = await WorldService.getWorld(this.bot.worldId);
    if (!this.world) {
      this.render404();
      return;
    }

    // Find sibling bots from the same world (excluding current bot)
    const siblings = await BotService.getBotsForWorld(this.world);
    this.relatedBots = siblings.filter(b => b.id !== this.botId);

    // 3. Inject parent world theme styles
    await ThemeLoader.loadWorldTheme(this.world.id, `${this.world.path}/${this.world.theme}`);

    // Set page title dynamically
    document.title = `${this.bot.name} - ${this.world.title} - World Nexus`;

    // 4. Construct DOM frames
    // 4. Construct DOM frames
    const logoWrapper = DOM.el('div', { class: 'world-hero-logo' });
    const loreContentNode = DOM.el('div', { class: 'lore-body-content' });
    const relationsTable = DOM.el('tbody');
    const relatedBotsContainer = DOM.el('div', { class: 'related-bots-grid' });

    // Populate relations metadata key-value table
    const relations = this.bot.metadata?.relations || {};
    const relationKeys = Object.keys(relations);
    if (relationKeys.length > 0) {
      relationKeys.forEach(name => {
        relationsTable.appendChild(DOM.el('tr', {},
          DOM.el('td', { class: 'bot-relation-name' }, name),
          DOM.el('td', { class: 'bot-relation-value' }, relations[name])
        ));
      } );
    } else {
      relationsTable.appendChild(DOM.el('tr', {},
        DOM.el('td', { colspan: '2', class: 'bot-relation-empty' }, 'No documented entity relationships.')
      ));
    }

    // Render abilities tags
    const abilities = this.bot.metadata?.abilities || [];
    const abilitiesPills = abilities.map(ability => 
      DOM.el('span', { class: 'tag tag-accent bot-tag-pill' }, ability)
    );

    // Dynamic collapsible bot lore button
    const collapseButton = DOM.el('button', {
      class: 'btn btn-secondary lore-collapse-btn',
      onclick: () => {
        const lorePanel = document.getElementById('bot-lore-panel');
        if (lorePanel) {
          lorePanel.classList.toggle('collapsed');
          const isCollapsed = lorePanel.classList.contains('collapsed');
          collapseButton.textContent = isCollapsed ? 'Expand Log' : 'Collapse Log';
          lorePanel.style.maxHeight = isCollapsed ? '80px' : 'none';
        }
      }
    }, 'Collapse Log');

    // Share Button event
    const shareButton = DOM.el('button', {
      class: 'btn btn-secondary',
      onclick: () => {
        navigator.clipboard.writeText(window.location.href);
        const originalText = shareButton.textContent;
        shareButton.textContent = 'Copied Link!';
        setTimeout(() => shareButton.textContent = originalText, 2000);
      }
    }, 'Share');

    // Assemble Page
    const pageContainer = DOM.el('div', { class: 'page-container bot-profile-view' },
      // 1. Hero / Profile Banner Block (Redesigned)
      DOM.el('section', { class: 'bot-hero-redesign' },
        // A tall vertical portrait card matching the reference layout
        DOM.el('div', { 
          class: 'bot-hero-portrait-card',
          style: {
            backgroundImage: `url(${this.bot.cardImage})`
          }
        },
          DOM.el('div', { class: 'hero-background-overlay' }),
          DOM.el('h1', { class: 'bot-hero-name' }, this.bot.name.toUpperCase())
        ),
        
        // Tagline below the portrait
        DOM.el('div', { class: 'bot-hero-tagline' }, 
          (this.bot.metadata?.character || '').toUpperCase()
        ),
        
        // Affiliation badge
        DOM.el('p', {
          class: 'bot-hero-affiliation-link',
          onclick: () => router.navigate(`/world/${this.world.id}`)
        }, `AFFILIATED WORLD: `, DOM.el('strong', {}, this.world.title.toUpperCase())),

        // Description Card
        DOM.el('div', { class: 'bot-hero-desc-card' },
          DOM.el('p', { class: 'bot-hero-description-text' }, this.bot.description)
        ),

        // Action Buttons Row
        DOM.el('div', { class: 'bot-hero-actions-redesign' },
          DOM.el('a', {
            href: this.bot.chatEndpoint || '#',
            class: `btn ${this.bot.chatEndpoint ? 'btn-accent' : 'btn-disabled'} bot-hero-chat-btn`,
            target: this.bot.chatEndpoint ? '_blank' : '_self',
            rel: 'noopener',
            onclick: (e) => {
              if (!this.bot.chatEndpoint) {
                e.preventDefault();
              }
            }
          }, 'Start Chat'),
          DOM.el('button', {
            class: 'btn btn-secondary',
            onclick: () => router.navigate(`/world/${this.world.id}`)
          }, 'Open World'),
          shareButton
        )
      ),

      // 2. Metadata Columns Layout
      DOM.el('div', { class: 'bot-specs-relations-row' },
        // Profile Info & Abilities
        DOM.el('div', { class: 'bot-specs-card' },
          DOM.el('h2', {}, 'System Specifications'),
          DOM.el('div', { class: 'bot-specs-list' },
            DOM.el('div', {}, DOM.el('span', { class: 'bot-spec-label' }, 'Character Type: '), DOM.el('span', {}, this.bot.metadata?.character || '-')),
            DOM.el('div', {}, DOM.el('span', { class: 'bot-spec-label' }, 'Timeline Vector: '), DOM.el('span', {}, this.bot.metadata?.timeline || '-')),
            DOM.el('div', {},
              DOM.el('span', { class: 'bot-spec-label-block' }, 'Specialized Abilities: '),
              DOM.el('div', { class: 'tags-list' }, ...abilitiesPills)
            )
          )
        ),
        // Relationships
        DOM.el('div', { class: 'bot-relations-card' },
          DOM.el('h2', {}, 'Social & Network Ties'),
          DOM.el('table', { class: 'bot-relations-table' },
            relationsTable
          )
        )
      ),

      // 3. Collapsible Chronicle Logs (Bot Lore)
      DOM.el('section', {
        id: 'bot-lore-panel',
        class: 'world-lore-panel bot-lore-panel'
      },
        DOM.el('div', { class: 'bot-lore-panel-header' },
          DOM.el('h2', {}, 'Entity Background logs'),
          collapseButton
        ),
        loreContentNode
      ),

      // 4. Related Bots Section
      DOM.el('section', { class: 'related-bots-section' },
        DOM.el('h2', {}, 'Related Entities in Sector'),
        relatedBotsContainer
      )
    );

    DOM.clear(this.appRoot);
    
    // Add breadcrumbs
    await Breadcrumbs.render(pageContainer, { page: 'bot', worldId: this.world.id, botId: this.bot.id });
    
    this.appRoot.appendChild(pageContainer);

    // Load related bots
    if (this.relatedBots.length > 0) {
      this.relatedBots.forEach(relBot => {
        relatedBotsContainer.appendChild(BotCard.render(relBot));
      });
    } else {
      relatedBotsContainer.appendChild(DOM.el('p', { class: 'related-bots-empty' }, 'No other intelligent entities registered in this world vector.'));
    }

    // Load Bot-specific Lore markdown logs (loads relative to world folder path)
    const loreUrl = `${this.world.path}/${this.bot.lore}`;
    const htmlMarkdown = await LoreService.loadLore(loreUrl);
    LoreService.buildHierarchicalLore(htmlMarkdown, loreContentNode, DOM.el('ul'));
  }

  /**
   * Helper to display error frames.
   */
  render404() {
    DOM.clear(this.appRoot);
    this.appRoot.appendChild(DOM.el('div', {
      class: 'page-container error-404-view'
    },
      DOM.el('h1', {}, 'Entity Vector Offline'),
      DOM.el('p', {}, 'The requested bot agent details do not exist inside sector databases.'),
      DOM.el('a', { href: 'index.html', class: 'btn btn-primary' }, 'Return to Nexus Core')
    ));
  }

  /**
   * Unloads world theme styles on exit.
   */
  unload() {
    ThemeLoader.unloadWorldTheme();
  }
}
export default BotPage;
