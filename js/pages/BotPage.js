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

    // Map relations to Bot avatars for minimal display
    const relations = this.bot.metadata?.relations || {};
    const relationKeys = Object.keys(relations);
    let tiesContainer = null;
    
    if (relationKeys.length > 0) {
      const avatarsList = relationKeys.map(name => {
        // Try to find the related bot in the current world
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

    // Render abilities tags
    const abilities = this.bot.metadata?.abilities || [];
    const abilitiesPills = abilities.map(ability => 
      DOM.el('span', { class: 'tag tag-accent bot-tag-pill' }, ability)
    );

    // Share Button
    const shareSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    shareSvg.setAttribute('viewBox', '0 0 16 16');
    shareSvg.setAttribute('width', '16');
    shareSvg.setAttribute('height', '16');
    shareSvg.setAttribute('fill', 'currentColor');
    const sharePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    sharePath.setAttribute('d', 'M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z');
    shareSvg.appendChild(sharePath);
    
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
      onclick: () => {
        navigator.clipboard.writeText(window.location.href);
      }
    }, shareSvg);

    // Collapsible Button with Dynamic Arrow
    const collapseSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    collapseSvg.setAttribute('viewBox', '0 0 16 16');
    collapseSvg.setAttribute('width', '16');
    collapseSvg.setAttribute('height', '16');
    collapseSvg.setAttribute('fill', 'currentColor');
    collapseSvg.style.transition = 'transform 0.3s ease';
    const collapsePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    collapsePath.setAttribute('d', 'M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z');
    collapseSvg.appendChild(collapsePath);

    const collapseButton = DOM.el('button', {
      class: 'btn btn-secondary lore-collapse-btn',
      title: 'Toggle Log',
      style: iconBtnStyle,
      onclick: () => {
        const lorePanel = document.getElementById('bot-lore-panel');
        if (lorePanel) {
          lorePanel.classList.toggle('collapsed');
          const isCollapsed = lorePanel.classList.contains('collapsed');
          collapseSvg.style.transform = isCollapsed ? 'rotate(180deg)' : 'rotate(0deg)';
        }
      }
    }, collapseSvg);
    
    const headerActions = DOM.el('div', { class: 'lore-header-actions', style: { display: 'flex', gap: '8px' } }, 
        shareButton, 
        collapseButton
    );

    // Auto-hide drawer toggle button SVG
    const svgNS = 'http://www.w3.org/2000/svg';
    const drawerToggleSvg = document.createElementNS(svgNS, 'svg');
    drawerToggleSvg.setAttribute('viewBox', '0 0 24 24');
    drawerToggleSvg.setAttribute('width', '24');
    drawerToggleSvg.setAttribute('height', '24');
    drawerToggleSvg.setAttribute('fill', 'none');
    drawerToggleSvg.setAttribute('stroke', 'currentColor');
    drawerToggleSvg.setAttribute('stroke-width', '2');
    const drawerTogglePath = document.createElementNS(svgNS, 'path');
    drawerTogglePath.setAttribute('d', 'M9 18l6-6-6-6');
    drawerToggleSvg.appendChild(drawerTogglePath);

    const drawerBtn = DOM.el('div', {
      class: 'lore-sidebar-toggle-btn',
      onclick: (e) => {
        e.stopPropagation();
        const wrapper = document.getElementById('lore-sidebar-drawer');
        if (wrapper) wrapper.classList.toggle('active');
      }
    }, drawerToggleSvg);

    const loreNav = DOM.el('ul');

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
        loreNav
      ),
      drawerBtn
    );

    const sidebarPositioner = DOM.el('div', {
      id: 'lore-sidebar-positioner',
      class: 'lore-sidebar-positioner'
    }, sidebarDrawer);

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
            style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
            target: this.bot.chatEndpoint ? '_blank' : '_self',
            rel: 'noopener',
            onclick: (e) => {
              if (!this.bot.chatEndpoint) {
                e.preventDefault();
              }
            }
          }, 
            DOM.el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', fill: 'currentColor', viewBox: '0 0 16 16' },
              DOM.el('path', { d: 'M2 1a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h9.586a2 2 0 0 1 1.414.586l2 2V2a1 1 0 0 0-1-1zm12-1a2 2 0 0 1 2 2v12.793a.5.5 0 0 1-.854.353l-2.853-2.853a1 1 0 0 0-.707-.293H2a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2z' })
            ),
            'Start Chat'
          ),
          DOM.el('button', {
            class: 'btn btn-secondary',
            style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
            onclick: () => router.navigate(`/world/${this.world.id}`)
          }, 
            DOM.el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', fill: 'currentColor', viewBox: '0 0 16 16' },
              DOM.el('path', { d: 'M0 8a8 8 0 1 1 16 0A8 8 0 0 1 0 8m7.5-6.923c-.67.204-1.335.82-1.887 1.855A8 8 0 0 0 5.145 4H7.5zM4.09 4a9.3 9.3 0 0 1 .64-1.539 7 7 0 0 1 .597-.933A7.03 7.03 0 0 0 2.255 4zm-.582 3.5c.03-.877.138-1.718.312-2.5H1.674a7 7 0 0 0-.656 2.5zM4.847 5a12.5 12.5 0 0 0-.338 2.5H7.5V5zM8.5 5v2.5h2.99a12.5 12.5 0 0 0-.337-2.5zM4.51 8.5a12.5 12.5 0 0 0 .337 2.5H7.5V8.5zm3.99 0V11h2.653c.187-.765.306-1.608.338-2.5zM5.145 12q.208.58.468 1.068c.552 1.035 1.218 1.65 1.887 1.855V12zm.182 2.472a7 7 0 0 1-.597-.933A9.3 9.3 0 0 1 4.09 12H2.255a7 7 0 0 0 3.072 2.472M3.82 11a13.7 13.7 0 0 1-.312-2.5h-2.14c.032.877.138 1.718.312 2.5zm6.853 3.472A7 7 0 0 0 13.745 12H11.91a9.3 9.3 0 0 1-.64 1.539 7 7 0 0 1-.597.933M8.5 12v2.923c.67-.204 1.335-.82 1.887-1.855q.26-.487.468-1.068zm3.68-1h2.146c.365-.767.594-1.61.656-2.5h-2.14a13.7 13.7 0 0 1-.662 2.5m2.802-3.5a7 7 0 0 0-.656-2.5H12.18c.174.782.282 1.623.312 2.5zM11.27 2.461c.247.464.462.98.64 1.539h1.835a7 7 0 0 0-3.072-2.472c.218.284.418.598.597.933M10.855 4a8 8 0 0 0-.468-1.068C9.835 1.897 9.17 1.282 8.5 1.077V4z' })
            ),
            'Open World'
          ),
          DOM.el('button', {
            class: 'btn btn-secondary',
            style: { display: 'inline-flex', alignItems: 'center', gap: '8px' },
            onclick: (e) => {
              navigator.clipboard.writeText(window.location.href);
              const btn = e.currentTarget;
              const originalContent = btn.innerHTML;
              btn.innerHTML = 'Copied Link!';
              setTimeout(() => { btn.innerHTML = originalContent; }, 2000);
            }
          }, 
            DOM.el('svg', { xmlns: 'http://www.w3.org/2000/svg', width: '16', height: '16', fill: 'currentColor', viewBox: '0 0 16 16' },
              DOM.el('path', { d: 'M13.5 1a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zM11 2.5a2.5 2.5 0 1 1 .603 1.628l-6.718 3.12a2.499 2.499 0 0 1 0 1.504l6.718 3.12a2.5 2.5 0 1 1-.488.876l-6.718-3.12a2.5 2.5 0 1 1 0-3.256l6.718-3.12A2.5 2.5 0 0 1 11 2.5zm-8.5 4a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm11 5.5a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z' })
            ),
            'Share Profile'
          )
        ),

        // Minimal Social Ties Row
        tiesContainer
      ),

      // 3. Collapsible Chronicle Logs (Bot Lore)
      DOM.el('section', {
        id: 'bot-lore-panel',
        class: 'world-lore-panel bot-lore-panel'
      },
        DOM.el('div', { class: 'bot-lore-panel-header' },
          DOM.el('h2', {}, 'Entity Background logs'),
          headerActions
        ),
        sidebarPositioner,
        DOM.el('div', { class: 'lore-grid' },
          loreContentNode
        )
      ),

      // 4. Related Bots Section
      DOM.el('section', { class: 'related-bots-section' },
        DOM.el('h2', {}, 'Related Entities in Sector'),
        relatedBotsContainer
      )
    );

    DOM.clear(this.appRoot);
    
    // Append container first
    this.appRoot.appendChild(pageContainer);

    // Add breadcrumbs to the app root (prepends by default)
    await Breadcrumbs.render(this.appRoot, { page: 'bot', worldId: this.world.id, botId: this.bot.id });

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
    LoreService.buildHierarchicalLore(htmlMarkdown, loreContentNode, loreNav);

    // Live algorithmic position for the Index Drawer
    let currentY = 0;
    let targetY = 0;
    
    const animateDrawer = () => {
      // Stop loop if component is unmounted
      if (!document.getElementById('lore-sidebar-positioner')) return;
      
      const positioner = document.getElementById('lore-sidebar-positioner');
      const drawer = document.getElementById('lore-sidebar-drawer');
      const panel = document.getElementById('bot-lore-panel');
      
      if (positioner && drawer && panel) {
        const panelRect = panel.getBoundingClientRect();
        const headerOffset = 100; // Account for the sticky main header
        
        let desiredY = 0;
        if (panelRect.top < headerOffset) {
          desiredY = headerOffset - panelRect.top;
          
          // Clamp the translation so the drawer doesn't push past the bottom padding
          const maxTranslate = panelRect.height - drawer.offsetHeight - 40;
          if (desiredY > maxTranslate) desiredY = maxTranslate;
        }
        targetY = Math.max(0, desiredY);
        
        // Smooth lerp interpolation
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
   * Unloads world theme styles on exit and cleans up animation frames.
   */
  unload() {
    if (this.drawerAnimFrame) {
      cancelAnimationFrame(this.drawerAnimFrame);
    }
    ThemeLoader.unloadWorldTheme();
  }
}
export default BotPage;
