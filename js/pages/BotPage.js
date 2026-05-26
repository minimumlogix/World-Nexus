/* js/pages/BotPage.js */
import { DOM } from '../utils/DOM.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { LoreService } from '../services/LoreService.js';
import { ThemeLoader } from '../ui/ThemeLoader.js';
import { SvgAnimator } from '../ui/SvgAnimator.js';
import { BotCard } from '../ui/BotCard.js';
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
    const logoWrapper = DOM.el('div', { class: 'world-hero-logo', style: { width: '64px', height: '64px', flexShrink: '0' } });
    const loreContentNode = DOM.el('div', { class: 'lore-body-content' });
    const relationsTable = DOM.el('tbody');
    const relatedBotsContainer = DOM.el('div', { 
      class: 'related-bots-grid', 
      style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '20px', marginTop: '20px' } 
    });

    // Populate relations metadata key-value table
    const relations = this.bot.metadata?.relations || {};
    const relationKeys = Object.keys(relations);
    if (relationKeys.length > 0) {
      relationKeys.forEach(name => {
        relationsTable.appendChild(DOM.el('tr', {},
          DOM.el('td', { style: { padding: '8px 12px', fontWeight: '700', borderBottom: '1px solid var(--border-color)', color: 'var(--accent, var(--primary-accent))' } }, name),
          DOM.el('td', { style: { padding: '8px 12px', borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' } }, relations[name])
        ));
      } );
    } else {
      relationsTable.appendChild(DOM.el('tr', {},
        DOM.el('td', { colspan: '2', style: { padding: '12px', textAlign: 'center', color: 'var(--text-muted)' } }, 'No documented entity relationships.')
      ));
    }

    // Render abilities tags
    const abilities = this.bot.metadata?.abilities || [];
    const abilitiesPills = abilities.map(ability => 
      DOM.el('span', { class: 'tag tag-accent', style: { pointerEvents: 'none' } }, ability)
    );

    // Dynamic collapsible bot lore button
    const collapseButton = DOM.el('button', {
      class: 'btn btn-secondary',
      style: { fontSize: '0.85rem' },
      onclick: () => {
        const lorePanel = document.getElementById('bot-lore-panel');
        if (lorePanel) {
          lorePanel.classList.toggle('collapsed');
          const isCollapsed = lorePanel.classList.contains('collapsed');
          collapseButton.textContent = isCollapsed ? 'Expand Log' : 'Collapse Log';
          lorePanel.style.maxHeight = isCollapsed ? '80px' : '2000px';
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
      // 1. Hero / Profile Banner Block
      DOM.el('section', {
        class: 'bot-hero gpu-accelerated',
        style: {
          backgroundImage: `linear-gradient(to bottom, rgba(4, 6, 9, 0.5) 0%, rgba(4, 6, 9, 0.95) 100%), url(${this.bot.cardImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          borderRadius: 'var(--border-radius-lg)',
          padding: '60px var(--spacing-desktop)',
          border: '1px solid var(--border-color)',
          boxShadow: 'var(--shadow-lg)',
          marginBottom: '32px',
          display: 'flex',
          gap: '32px',
          alignItems: 'center',
          flexWrap: 'wrap'
        }
      },
        DOM.el('div', {
          class: 'bot-profile-avatar-wrap',
          style: {
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            overflow: 'hidden',
            border: '4px solid var(--accent, var(--primary-accent))',
            boxShadow: 'var(--shadow-md)',
            flexShrink: '0'
          }
        },
          DOM.el('img', { src: this.bot.avatar, alt: `${this.bot.name} avatar`, style: { width: '100%', height: '100%', objectFit: 'cover' } })
        ),
        DOM.el('div', { class: 'bot-hero-text', style: { flexGrow: '1', flexBasis: '320px' } },
          DOM.el('div', { style: { display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' } },
            DOM.el('h1', { style: { fontSize: '2.5rem', fontWeight: '800' } }, this.bot.name),
            DOM.el('span', { class: 'card-bot-count', style: { background: 'rgba(var(--accent-rgb, 56, 189, 248), 0.15)', color: 'var(--accent, var(--primary-accent))', border: '1px solid var(--accent, var(--primary-accent))', textTransform: 'uppercase', fontSize: '0.7rem', fontWeight: '700' } }, this.bot.status)
          ),
          DOM.el('p', {
            style: { fontSize: '1rem', color: 'var(--text-muted)', marginBottom: '16px', cursor: 'pointer' },
            onclick: () => router.navigate(`/world/${this.world.id}`)
          }, `Affiliated World: `, DOM.el('strong', { style: { color: 'var(--accent, var(--primary-accent))', textDecoration: 'underline' } }, this.world.title)),
          DOM.el('p', { style: { fontSize: '1.1rem', color: 'var(--text-secondary)', marginBottom: '24px', maxWidth: '800px' } }, this.bot.description)
        ),
        // Action Buttons Row
        DOM.el('div', { style: { display: 'flex', gap: '12px', width: '100%', flexWrap: 'wrap', borderTop: '1px solid var(--border-color)', paddingTop: '24px', marginTop: '12px' } },
          DOM.el('a', {
            href: this.bot.chatEndpoint || '#',
            class: 'btn btn-accent',
            target: '_blank',
            rel: 'noopener',
            onclick: (e) => {
              if (!this.bot.chatEndpoint) {
                e.preventDefault();
                alert('This agent is currently offline (chat endpoint not configured).');
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
      DOM.el('div', {
        style: {
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
          gap: '32px',
          marginBottom: '40px'
        }
      },
        // Profile Info & Abilities
        DOM.el('div', {
          style: { backgroundColor: 'var(--card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '24px' }
        },
          DOM.el('h2', { style: { fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' } }, 'System Specifications'),
          DOM.el('div', { style: { display: 'flex', flexDirection: 'column', gap: '12px' } },
            DOM.el('div', {}, DOM.el('span', { style: { color: 'var(--text-muted)', fontSize: '0.85rem' } }, 'Character Type: '), DOM.el('span', {}, this.bot.metadata?.character || '-')),
            DOM.el('div', {}, DOM.el('span', { style: { color: 'var(--text-muted)', fontSize: '0.85rem' } }, 'Timeline Vector: '), DOM.el('span', {}, this.bot.metadata?.timeline || '-')),
            DOM.el('div', {},
              DOM.el('span', { style: { color: 'var(--text-muted)', fontSize: '0.85rem', display: 'block', marginBottom: '8px' } }, 'Specialized Abilities: '),
              DOM.el('div', { class: 'tags-list' }, ...abilitiesPills)
            )
          )
        ),
        // Relationships
        DOM.el('div', {
          style: { backgroundColor: 'var(--card)', border: '1px solid var(--border-color)', borderRadius: 'var(--border-radius-md)', padding: '24px' }
        },
          DOM.el('h2', { style: { fontSize: '1.2rem', marginBottom: '16px', borderBottom: '1px solid var(--border-color)', paddingBottom: '8px' } }, 'Social & Network Ties'),
          DOM.el('table', { style: { width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' } },
            relationsTable
          )
        )
      ),

      // 3. Collapsible Chronicle Logs (Bot Lore)
      DOM.el('section', {
        id: 'bot-lore-panel',
        class: 'world-lore-panel',
        style: {
          backgroundColor: 'var(--card)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--border-radius-md)',
          padding: '24px var(--spacing-desktop)',
          marginBottom: '40px',
          maxHeight: '2000px',
          transition: 'max-height var(--transition-slow)',
          overflow: 'hidden'
        }
      },
        DOM.el('div', {
          style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '16px', marginBottom: '20px' }
        },
          DOM.el('h2', { style: { fontSize: '1.25rem' } }, 'Entity Background logs'),
          collapseButton
        ),
        loreContentNode
      ),

      // 4. Related Bots Section
      DOM.el('section', { class: 'related-bots-section' },
        DOM.el('h2', { style: { fontSize: '1.5rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '12px' } }, 'Related Entities in Sector'),
        relatedBotsContainer
      )
    );

    DOM.clear(this.appRoot);
    this.appRoot.appendChild(pageContainer);

    // Load related bots
    if (this.relatedBots.length > 0) {
      this.relatedBots.forEach(relBot => {
        relatedBotsContainer.appendChild(BotCard.render(relBot));
      });
    } else {
      relatedBotsContainer.appendChild(DOM.el('p', { style: { color: 'var(--text-muted)', fontStyle: 'italic', gridColumn: '1 / -1' } }, 'No other intelligent entities registered in this world vector.'));
    }

    // Load Bot-specific Lore markdown logs (loads relative to world folder path)
    const loreUrl = `${this.world.path}/${this.bot.lore}`;
    const htmlMarkdown = await LoreService.loadLore(loreUrl);
    loreContentNode.innerHTML = htmlMarkdown;
  }

  /**
   * Helper to display error frames.
   */
  render404() {
    DOM.clear(this.appRoot);
    this.appRoot.appendChild(DOM.el('div', {
      class: 'page-container error-404-view',
      style: { textAlign: 'center', padding: '96px 24px' }
    },
      DOM.el('h1', { style: { fontSize: '2.5rem', marginBottom: '16px' } }, 'Entity Vector Offline'),
      DOM.el('p', { style: { color: 'var(--text-muted)', marginBottom: '24px' } }, 'The requested bot agent details do not exist inside sector databases.'),
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
