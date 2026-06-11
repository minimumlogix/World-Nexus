/* js/pages/LandingPage.js */
import { DOM } from '../utils/DOM.js';
import { WorldService } from '../services/WorldService.js';
import { BotService } from '../services/BotService.js';
import { Search } from '../ui/Search.js';
import { SvgAnimator } from '../ui/SvgAnimator.js';
import { router } from '../core/Router.js';
import { WorldCard } from '../ui/WorldCard.js';
import { BotCard } from '../ui/BotCard.js';
import { globalCache } from '../core/Cache.js';
import { globalEventBus } from '../core/EventBus.js';
import { stateManager } from '../core/StateManager.js';
import { ToolService } from '../services/ToolService.js';
import { ToolCard } from '../ui/ToolCard.js';


export class LandingPage {
  /**
   * Controller for index page views.
   * @param {HTMLElement} appRoot - App insertion parent node
   */
  constructor(appRoot) {
    this.appRoot = appRoot;
    this.worlds = [];
    this.searchController = null;
    this.subscriptions = [];
    this.isLoadingJoyland = false;
    this.tools = [];
  }

  /**
   * Loads configurations, sets statistics, constructs grids, and binds state managers.
   */
  async load() {
    // 1. Asynchronously load datasets
    const config = await WorldService.getConfig();
    this.worlds = await WorldService.getWorlds();
    this.tools = await ToolService.getTools();
    const localBots = await BotService.getAllBots();

    // Update mobile nav drawer stats (mobile-stat IDs still exist in HTML)
    const updateStats = (id, val) => {
      const node = document.getElementById(id);
      if (node) node.textContent = val;
    };
    updateStats('mobile-stat-worlds', this.worlds.length);

    const activeBotsCount = localBots.filter(b => BotService.hasActualChatLink(b)).length;
    updateStats('mobile-stat-bots', activeBotsCount);

    // Initialize Joyland dynamic bot states
    this.joylandBots = [];
    this.activeSidebarTag = null;
    this.sidebarSearchQuery = '';
    this.activeGenderFilter = 'All'; // Initialize gender filter

    // 4. Construct DOM frames — sidebar panel only (no world grid)
    // Default tab: LOCAL WORLDS (shown first)
    this.activeSidebarTab = 'worlds';
    this.sidebarSearchQuery = '';
    this.activeSidebarTag = null;
    this.sidebarSortBy = 'alphabetical'; // Default sort for worlds

    const sidebarTabs = DOM.el('div', { class: 'sidebar-tabs' });
    const sidebarControls = DOM.el('div', { class: 'sidebar-controls' });
    const sidebarContentContainer = DOM.el('div', { class: 'sidebar-bots-container' });

    // Try loading Joyland bots from memory cache, otherwise fetch in background
    const cachedJoyland = globalCache.get('joyland_bots');
    if (cachedJoyland) {
      this.joylandBots = cachedJoyland;
    } else {
      this.fetchJoylandBotsInBackground(sidebarContentContainer);
    }

    // LOCAL WORLDS tab — first (left) and active by default
    const worldsTabBtn = DOM.el('button', {
      class: `sidebar-tab ${this.activeSidebarTab === 'worlds' ? 'active' : ''}`,
      onclick: () => {
        this.activeSidebarTab = 'worlds';
        this.sidebarSearchQuery = '';
        this.activeSidebarTag = null;
        this.sidebarSortBy = 'alphabetical';
        worldsTabBtn.classList.add('active');
        botsTabBtn.classList.remove('active');
        toolsTabBtn.classList.remove('active');
        stateManager.setState('searchQuery', '', true);
        const globalSearchInput = document.getElementById('global-search-input');
        if (globalSearchInput) globalSearchInput.value = '';
        this.renderSidebar(sidebarControls, sidebarContentContainer);
      }
    }, 'WORLDS');

    // JOYLAND BOTS tab — second (middle)
    const botsTabBtn = DOM.el('button', {
      class: `sidebar-tab ${this.activeSidebarTab === 'bots' ? 'active' : ''}`,
      onclick: () => {
        this.activeSidebarTab = 'bots';
        this.sidebarSearchQuery = '';
        this.activeSidebarTag = null;
        this.activeGenderFilter = 'All';
        this.sidebarSortBy = 'time'; // Newest first
        botsTabBtn.classList.add('active');
        worldsTabBtn.classList.remove('active');
        toolsTabBtn.classList.remove('active');
        stateManager.setState('searchQuery', '', true);
        const globalSearchInput = document.getElementById('global-search-input');
        if (globalSearchInput) globalSearchInput.value = '';
        this.renderSidebar(sidebarControls, sidebarContentContainer);
      }
    }, 'BOTS');

    // TOOLS tab — third (right)
    const toolsTabBtn = DOM.el('button', {
      class: `sidebar-tab ${this.activeSidebarTab === 'tools' ? 'active' : ''}`,
      onclick: () => {
        this.activeSidebarTab = 'tools';
        this.sidebarSearchQuery = '';
        this.activeSidebarTag = null;
        this.sidebarSortBy = 'alphabetical';
        toolsTabBtn.classList.add('active');
        worldsTabBtn.classList.remove('active');
        botsTabBtn.classList.remove('active');
        stateManager.setState('searchQuery', '', true);
        const globalSearchInput = document.getElementById('global-search-input');
        if (globalSearchInput) globalSearchInput.value = '';
        this.renderSidebar(sidebarControls, sidebarContentContainer);
      }
    }, 'TOOLS');

    // LOCAL WORLDS first, then JOYLAND BOTS, then TOOLS
    sidebarTabs.appendChild(worldsTabBtn);
    sidebarTabs.appendChild(botsTabBtn);
    sidebarTabs.appendChild(toolsTabBtn);

    const pageContainer = DOM.el('div', { class: 'page-container landing-page-view' },
      // Glowing space curves + Compass logo
      DOM.el('section', { class: 'landing-hero' },
        DOM.el('svg', {
          class: 'hero-compass-logo hero-compass-logo-main',
          viewBox: '0 0 100 100',
          width: '56',
          height: '56',
          fill: 'none',
          stroke: 'var(--accent-gold)',
          strokeWidth: '1.5'
        },
          DOM.el('circle', { cx: '50', cy: '50', r: '42', stroke: 'var(--accent-gold)', strokeOpacity: '0.4' }),
          DOM.el('circle', { cx: '50', cy: '50', r: '28', stroke: 'var(--accent-gold)', strokeOpacity: '0.3', 'stroke-dasharray': '4,3' }),
          DOM.el('line', { x1: '50', y1: '8', x2: '50', y2: '92', stroke: 'var(--accent-gold)', strokeOpacity: '0.5' }),
          DOM.el('line', { x1: '8', y1: '50', x2: '92', y2: '50', stroke: 'var(--accent-gold)', strokeOpacity: '0.5' }),
          DOM.el('polygon', { points: '50,15 54,46 85,50 54,54 50,85 46,54 15,50 46,46', fill: 'var(--accent-gold)' })
        ),
        DOM.el('h1', {}, config.siteName),
        DOM.el('div', { class: 'gold-divider' }, 
          DOM.el('div', { class: 'gold-divider-diamond' })
        ),
        DOM.el('p', { class: 'landing-hero-tagline' }, config.tagline)
      ),

      // Full-width panel — no left world grid column
      DOM.el('div', { class: 'landing-full-panel' },
        sidebarTabs,
        sidebarControls,
        sidebarContentContainer
      ),
      this.renderDashboard(localBots, activeBotsCount)
    );

    DOM.clear(this.appRoot);
    this.appRoot.appendChild(pageContainer);

    // Observe hero compass logo
    const heroLogo = pageContainer.querySelector('.hero-compass-logo');
    if (heroLogo) SvgAnimator.observeVisibility(heroLogo);

    // Initialize sidebar with default tab (LOCAL WORLDS)
    this.renderSidebar(sidebarControls, sidebarContentContainer);

    // 5. Bind header search input
    const searchInput = document.getElementById('global-search-input');
    const searchWrapper = document.getElementById('header-search-wrapper');
    if (searchInput && searchWrapper) {
      searchWrapper.style.display = 'block';
      this.searchController = new Search(searchInput);
    }

    // Sync with global header search input
    this.subscriptions.push(
      globalEventBus.on('state:searchQuery', (query) => {
        this.sidebarSearchQuery = (query || '').toLowerCase();
        const sidebarInput = this.appRoot.querySelector('.sidebar-search-input');
        if (sidebarInput && sidebarInput.value !== query) {
          sidebarInput.value = query || '';
        }
        const contentNode = this.appRoot.querySelector('.sidebar-bots-container');
        if (contentNode) {
          if (this.activeSidebarTab === 'bots') {
            this.filterAndRenderSidebarBots(contentNode);
          } else if (this.activeSidebarTab === 'worlds') {
            this.filterAndRenderSidebarWorlds(contentNode);
          } else if (this.activeSidebarTab === 'tools') {
            this.filterAndRenderSidebarTools(contentNode);
          }
        }
      })
    );

    // Dynamic redraw on background stats/bots sync completion
    this.subscriptions.push(
      globalEventBus.on('bots:synced', () => {
        const contentNode = this.appRoot.querySelector('.sidebar-bots-container');
        if (contentNode) {
          if (this.activeSidebarTab === 'bots') {
            this.filterAndRenderSidebarBots(contentNode);
          } else if (this.activeSidebarTab === 'worlds') {
            this.filterAndRenderSidebarWorlds(contentNode);
          } else if (this.activeSidebarTab === 'tools') {
            this.filterAndRenderSidebarTools(contentNode);
          }
        }
      })
    );

    // Dynamic redraw on background search indexing completion
    this.subscriptions.push(
      globalEventBus.on('search:indexed', () => {
        const contentNode = this.appRoot.querySelector('.sidebar-bots-container');
        if (contentNode) {
          if (this.activeSidebarTab === 'bots') {
            this.filterAndRenderSidebarBots(contentNode);
          } else if (this.activeSidebarTab === 'worlds') {
            this.filterAndRenderSidebarWorlds(contentNode);
          }
        }
      })
    );

    this.subscriptions.push(
      globalEventBus.on('landing:selectTab', (tabName) => {
        if (!['worlds', 'bots', 'tools'].includes(tabName)) return;
        const tabButtons = { worlds: worldsTabBtn, bots: botsTabBtn, tools: toolsTabBtn };
        if (this.activeSidebarTab !== tabName) {
          tabButtons[tabName].click();
        }
      })
    );
  }

  // Note: generateFingerprint and fetchPublicBots logic has been moved to BotService.js

  parseCount(val) {
    if (!val) return 0;
    const str = String(val).toLowerCase().trim();
    if (str.endsWith('k')) {
      return parseFloat(str) * 1000;
    }
    if (str.endsWith('m')) {
      return parseFloat(str) * 1000000;
    }
    return parseInt(str, 10) || 0;
  }

  safeText(value) {
    return String(value || '').toLowerCase();
  }

  renderDashboard(localBots, activeBotsCount) {
    const genreCounts = new Map();
    this.worlds.forEach(world => {
      (world.genres || []).forEach(genre => {
        genreCounts.set(genre, (genreCounts.get(genre) || 0) + 1);
      });
    });

    const topGenre = Array.from(genreCounts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] || 'Uncharted';
    const linkedTools = this.tools.filter(tool => tool.link).length;

    return DOM.el('section', { class: 'landing-dashboard-section', 'aria-label': 'Nexus status' },
      DOM.el('h2', { class: 'dashboard-title' }, 'Nexus Status'),
      DOM.el('div', { class: 'dashboard-grid' },
        this.renderDashboardCard('Worlds Indexed', this.worlds.length, 'Local realities available'),
        this.renderDashboardCard('Active Bots', activeBotsCount, `${localBots.length} local profiles scanned`),
        this.renderDashboardCard('Tools Online', linkedTools, `${this.tools.length} tools registered`),
        this.renderDashboardCard('Top Genre', topGenre, 'Most common world signal')
      )
    );
  }

  renderDashboardCard(label, value, detail) {
    return DOM.el('article', { class: 'dashboard-card' },
      DOM.el('h3', {}, label),
      DOM.el('div', { class: 'diagnostics-list' },
        DOM.el('div', { class: 'diagnostic-item' },
          DOM.el('span', { class: 'diag-label' }, 'Status'),
          DOM.el('span', { class: 'diag-value status-online' },
            DOM.el('span', { class: 'blinking-dot' }),
            value
          )
        ),
        DOM.el('div', { class: 'diagnostic-item' },
          DOM.el('span', { class: 'diag-label' }, 'Signal'),
          DOM.el('span', { class: 'diag-value' }, detail)
        )
      )
    );
  }

  renderSidebar(controlsNode, contentNode) {
    DOM.clear(controlsNode);
    DOM.clear(contentNode);

    const searchInput = DOM.el('input', {
      type: 'text',
      class: 'search-input-box sidebar-search-input',
      placeholder: this.activeSidebarTab === 'bots' ? 'Search bots...' : (this.activeSidebarTab === 'tools' ? 'Search tools...' : 'Search worlds...'),
      value: this.sidebarSearchQuery,
      oninput: (e) => stateManager.setState('searchQuery', e.target.value.trim())
    });
    controlsNode.appendChild(searchInput);

    let sortSelectWrapper;
    if (this.activeSidebarTab === 'bots') {
      const select = DOM.el('select', { class: 'sort-select', onchange: (e) => { this.sidebarSortBy = e.target.value; this.filterAndRenderSidebarBots(contentNode); } },
        DOM.el('option', { value: 'time' }, 'Sort by Time (Newest)'),
        DOM.el('option', { value: 'chats' }, 'Sort by Chats'),
        DOM.el('option', { value: 'likes' }, 'Sort by Likes'),
        DOM.el('option', { value: 'alphabetical' }, 'Alphabetical (A-Z)')
      );
      select.value = this.sidebarSortBy || 'time';
      const genderSelect = DOM.el('select', { class: 'sort-select', onchange: (e) => { this.activeGenderFilter = e.target.value; this.filterAndRenderSidebarBots(contentNode); } },
        DOM.el('option', { value: 'All' }, 'All Genders'),
        DOM.el('option', { value: 'Male' }, 'Male'),
        DOM.el('option', { value: 'Female' }, 'Female'),
        DOM.el('option', { value: 'Non-binary' }, 'Non-binary')
      );
      genderSelect.value = this.activeGenderFilter || 'All';
      controlsNode.appendChild(DOM.el('div', { class: 'sidebar-filters-row' },
        DOM.el('div', { class: 'sort-select-wrapper sidebar-sort-wrapper', style: { flex: '1' } }, select),
        DOM.el('div', { class: 'sort-select-wrapper sidebar-sort-wrapper', style: { flex: '1' } }, genderSelect)
      ));
    } else {
      const select = DOM.el('select', { class: 'sort-select', onchange: (e) => { this.sidebarSortBy = e.target.value; this.activeSidebarTab === 'worlds' ? this.filterAndRenderSidebarWorlds(contentNode) : this.filterAndRenderSidebarTools(contentNode); } },
        ...(this.activeSidebarTab === 'worlds' ? [DOM.el('option', { value: 'alphabetical' }, 'Alphabetical (A-Z)'), DOM.el('option', { value: 'popular' }, 'Bot Density')] : [DOM.el('option', { value: 'alphabetical' }, 'Alphabetical (A-Z)'), DOM.el('option', { value: 'beta' }, 'Beta Status')])
      );
      select.value = this.sidebarSortBy || 'alphabetical';
      controlsNode.appendChild(DOM.el('div', { class: 'sort-select-wrapper sidebar-sort-wrapper' }, select));
    }

    const tagsContainer = DOM.el('div', { class: 'sidebar-tags-list sidebar-tags-container' });
    controlsNode.appendChild(tagsContainer);
    this.renderSidebarTags(tagsContainer, contentNode);
    if (this.activeSidebarTab === 'bots') this.filterAndRenderSidebarBots(contentNode);
    else if (this.activeSidebarTab === 'worlds') this.filterAndRenderSidebarWorlds(contentNode);
    else this.filterAndRenderSidebarTools(contentNode);
  }

  renderSidebarTags(tagsContainer, contentNode) {
    DOM.clear(tagsContainer);
    tagsContainer.style.display = this.activeSidebarTab === 'tools' ? 'none' : 'flex';
    if (this.activeSidebarTab === 'tools') return;
    
    const allTags = Array.from(new Set(this.activeSidebarTab === 'bots' ? [...this.joylandBots.map(b => b.category), ...this.joylandBots.flatMap(b => b.tags || [])] : this.worlds.flatMap(w => w.genres || []))).filter(Boolean).slice(0, 15);
    
    tagsContainer.appendChild(DOM.el('span', { class: `tag tag-sm ${!this.activeSidebarTag ? 'active' : ''}`, onclick: () => { this.activeSidebarTag = null; stateManager.setState('searchQuery', ''); this.renderSidebarTags(tagsContainer, contentNode); } }, 'ALL'));
    allTags.forEach(tag => {
      tagsContainer.appendChild(DOM.el('span', { class: `tag tag-sm ${this.activeSidebarTag === tag ? 'active' : ''}`, onclick: () => { this.activeSidebarTag = this.activeSidebarTag === tag ? null : tag; stateManager.setState('searchQuery', this.activeSidebarTag || ''); this.renderSidebarTags(tagsContainer, contentNode); } }, tag.toUpperCase()));
    });
  }

  filterAndRenderSidebarBots(container) {
    DOM.clear(container);
    const localBots = globalCache.get('all_bots_global') || [];
    const filtered = this.joylandBots.filter(bot => {
      const search = this.sidebarSearchQuery;
      if (!search) return true;

      const localBot = localBots.find(lb => lb.id === bot.id);
      if (localBot && localBot.searchIndexContent) {
        return localBot.searchIndexContent.includes(search);
      }

      return [bot.name, bot.introduce, bot.category, ...(bot.tags || [])].some(t => this.safeText(t).includes(search));
    }).filter(bot =>
      (!this.activeGenderFilter || this.activeGenderFilter === 'All' || bot.gender === this.activeGenderFilter) &&
      (!this.activeSidebarTag || (bot.tags || []).includes(this.activeSidebarTag) || bot.category === this.activeSidebarTag)
    ).sort((a, b) => this.sidebarSortBy === 'time' ? a.timeIndex - b.timeIndex : this.sidebarSortBy === 'chats' ? this.parseCount(b.chats) - this.parseCount(a.chats) : this.sidebarSortBy === 'likes' ? this.parseCount(b.likes) - this.parseCount(a.likes) : a.name.localeCompare(b.name));
    
    const fragment = document.createDocumentFragment();
    if (filtered.length === 0) {
      if (this.isLoadingJoyland) {
        // Render 6 skeleton card placeholders during background sync
        for (let i = 0; i < 6; i++) {
          const skeleton = BotCard.renderSkeleton();
          skeleton.classList.add('sidebar-bot-card-premium');
          fragment.appendChild(skeleton);
        }
      } else {
        fragment.appendChild(DOM.el('div', { class: 'sidebar-empty-results' }, 'No matching Joyland bots found.'));
      }
    } else {
      filtered.forEach((bot, index) => {
        const card = BotCard.render(bot);
        card.classList.add('sidebar-bot-card-premium', 'card-enter-anim');
        const staggerIndex = Math.min(index, 24);
        card.style.animationDelay = `${staggerIndex * 40}ms`;
        fragment.appendChild(card);
      });
    }
    container.appendChild(fragment);
  }

  filterAndRenderSidebarWorlds(container) {
    DOM.clear(container);
    const filtered = this.worlds.filter(w => {
      if (!this.sidebarSearchQuery) return true;
      if (w.searchIndexContent) {
        return w.searchIndexContent.includes(this.sidebarSearchQuery);
      }
      return [w.title, w.description, ...(w.genres || [])].some(t => this.safeText(t).includes(this.sidebarSearchQuery));
    }).filter(w => !this.activeSidebarTag || (w.genres || []).includes(this.activeSidebarTag))
      .sort((a, b) => this.sidebarSortBy === 'popular' ? (b.botCount || 0) - (a.botCount || 0) : a.title.localeCompare(b.title));
    const fragment = document.createDocumentFragment();
    if (filtered.length === 0) {
      fragment.appendChild(DOM.el('div', { class: 'sidebar-empty-results' }, 'No matching local worlds found.'));
    } else {
      filtered.forEach((w, index) => {
        const card = WorldCard.render(w);
        card.classList.add('sidebar-bot-card-premium', 'card-enter-anim');
        const staggerIndex = Math.min(index, 24);
        card.style.animationDelay = `${staggerIndex * 40}ms`;
        fragment.appendChild(card);
      });
    }
    container.appendChild(fragment);
  }

  filterAndRenderSidebarTools(container) {
    DOM.clear(container);
    const filtered = this.tools.filter(t => !this.sidebarSearchQuery || [t.name, t.intro].some(v => this.safeText(v).includes(this.sidebarSearchQuery))).sort((a, b) => this.sidebarSortBy === 'beta' ? (b.ifbeta ? 1 : 0) - (a.ifbeta ? 1 : 0) || a.name.localeCompare(b.name) : a.name.localeCompare(b.name));
    const fragment = document.createDocumentFragment();
    if (filtered.length === 0) {
      fragment.appendChild(DOM.el('div', { class: 'sidebar-empty-results' }, 'No matching tools found.'));
    } else {
      filtered.forEach((t, index) => {
        const card = ToolCard.render(t);
        card.classList.add('sidebar-bot-card-premium', 'card-enter-anim');
        const staggerIndex = Math.min(index, 24);
        card.style.animationDelay = `${staggerIndex * 40}ms`;
        fragment.appendChild(card);
      });
    }
    container.appendChild(fragment);
  }

  async fetchJoylandBotsInBackground(container) {
    this.isLoadingJoyland = true;
    try {
      this.joylandBots = await BotService.getJoylandBots();
      if (this.activeSidebarTab === 'bots') this.filterAndRenderSidebarBots(container);
    } catch (e) { console.warn('Sync failed:', e); } finally { this.isLoadingJoyland = false; }
  }

  unload() {
    this.subscriptions.forEach(u => u());
    if (this.searchController) this.searchController.destroy();
    const sw = document.getElementById('header-search-wrapper');
    if (sw) sw.style.display = 'none';
  }
}
export default LandingPage;
