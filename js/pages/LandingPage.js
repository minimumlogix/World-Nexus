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
  }

  /**
   * Loads configurations, sets statistics, constructs grids, and binds state managers.
   */
  async load() {
    // 1. Asynchronously load datasets
    const config = await WorldService.getConfig();
    this.worlds = await WorldService.getWorlds();
    const allBots = await BotService.getAllBots();


    // Update mobile nav drawer stats (mobile-stat IDs still exist in HTML)
    const updateStats = (id, val) => {
      const node = document.getElementById(id);
      if (node) node.textContent = val;
    };
    updateStats('mobile-stat-worlds', this.worlds.length);
    updateStats('mobile-stat-bots', allBots.length);

    // Initialize Joyland dynamic bot states
    this.joylandBots = [];
    this.activeSidebarTag = null;
    this.sidebarSearchQuery = '';

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
        stateManager.setState('searchQuery', '');
        this.renderSidebar(sidebarControls, sidebarContentContainer);
      }
    }, 'WORLDS');

    // JOYLAND BOTS tab — second (right)
    const botsTabBtn = DOM.el('button', {
      class: `sidebar-tab ${this.activeSidebarTab === 'bots' ? 'active' : ''}`,
      onclick: () => {
        this.activeSidebarTab = 'bots';
        this.sidebarSearchQuery = '';
        this.activeSidebarTag = null;
        this.sidebarSortBy = 'chats';
        botsTabBtn.classList.add('active');
        worldsTabBtn.classList.remove('active');
        stateManager.setState('searchQuery', '');
        this.renderSidebar(sidebarControls, sidebarContentContainer);
      }
    }, 'BOTS');

    // LOCAL WORLDS first, then JOYLAND BOTS
    sidebarTabs.appendChild(worldsTabBtn);
    sidebarTabs.appendChild(botsTabBtn);

    // Compute analytics
    const worldBotCounts = this.worlds.map(w => {
      const count = allBots.filter(b => b.worldId === w.id).length;
      return {
        title: w.title,
        id: w.id,
        count: count
      };
    });

    const maxCount = Math.max(...worldBotCounts.map(w => w.count), 1);
    const barsContainer = DOM.el('div', { class: 'dashboard-card chart-card' },
      DOM.el('h3', {}, 'Sector Intelligent Entity Density')
    );
    
    const barWrapper = DOM.el('div', { class: 'chart-container' });
    const barsHtml = worldBotCounts.map((w, idx) => {
      const percentage = (w.count / maxCount) * 100;
      const y = 25 + idx * 45;
      
      let gradColor = '#d4af37';
      if (w.id === 'abyss') gradColor = '#22d3ee';
      if (w.id === 'neonveil') gradColor = '#ec4899';
      if (w.id === 'azmerheim') gradColor = '#f59e0b';
      
      return `
        <g>
          <text x="10" y="${y - 6}" fill="var(--text-secondary)" font-size="11" font-family="var(--font-sans)">${w.title}</text>
          <text x="360" y="${y - 6}" fill="${gradColor}" font-size="11" font-weight="700" text-anchor="end">${w.count} Bot${w.count === 1 ? '' : 's'}</text>
          <rect x="10" y="${y}" width="350" height="6" rx="3" fill="rgba(255,255,255,0.03)" />
          <rect class="chart-bar-fill" x="10" y="${y}" width="0" height="6" rx="3" fill="${gradColor}" style="--target-width: ${(percentage / 100) * 350}px;" />
        </g>
      `;
    }).join('');
    
    barWrapper.innerHTML = `
      <svg viewBox="0 0 380 ${20 + worldBotCounts.length * 45}" width="100%" height="100%" style="display: block;">
        ${barsHtml}
      </svg>
    `;
    barsContainer.appendChild(barWrapper);

    const diagnosticsContainer = DOM.el('div', { class: 'dashboard-card diagnostics-card' },
      DOM.el('h3', {}, 'Diagnostics & Grid Clusters'),
      DOM.el('div', { class: 'diagnostics-list' },
        DOM.el('div', { class: 'diagnostic-item' },
          DOM.el('span', { class: 'diag-label' }, 'Registry Sync State:'),
          DOM.el('span', { class: 'diag-value status-online' }, 
            DOM.el('span', { class: 'blinking-dot' }),
            'ONLINE'
          )
        ),
        DOM.el('div', { class: 'diagnostic-item' },
          DOM.el('span', { class: 'diag-label' }, 'Sector Clusters:'),
          DOM.el('span', { class: 'diag-value' }, `${this.worlds.length} Sectors Active`)
        ),
        DOM.el('div', { class: 'diagnostic-item' },
          DOM.el('span', { class: 'diag-label' }, 'Dynamic AI Entities:'),
          DOM.el('span', { class: 'diag-value' }, `${allBots.length} registered`)
        ),
        DOM.el('div', { class: 'diagnostic-item' },
          DOM.el('span', { class: 'diag-label' }, 'Database Integrity:'),
          DOM.el('span', { class: 'diag-value' }, '100% SECURE')
        )
      )
    );

    const dashboardSection = DOM.el('section', { class: 'landing-dashboard-section' },
      DOM.el('h2', { class: 'dashboard-title' }, 'Sector Index Analytics'),
      DOM.el('div', { class: 'dashboard-grid' },
        barsContainer,
        diagnosticsContainer
      )
    );

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

      // Sector Index Analytics Dashboard
      dashboardSection
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
          } else {
            this.filterAndRenderSidebarWorlds(contentNode);
          }
        }
      })
    );
  }

  generateFingerprint() {
    return (
      Math.random().toString(36).slice(2) +
      Math.random().toString(36).slice(2)
    );
  }

  async fetchPublicBots(userId) {
    const url = `https://api.joyland.ai/profile/public-bots?userId=${userId}`;
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json, text/plain, */*',
          'Accept-Language': 'en',
          'Fingerprint': this.generateFingerprint(),
          'Origin': 'https://www.joyland.ai',
          'Referer': 'https://www.joyland.ai/'
        }
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (error) {
      console.warn(`Error fetching bots for ${userId}:`, error);
      return null;
    }
  }

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

  renderSidebar(controlsNode, contentNode) {
    DOM.clear(controlsNode);
    DOM.clear(contentNode);

    // 1. Search Input for Sidebar (Capsule layout)
    const searchInput = DOM.el('input', {
      type: 'text',
      class: 'search-input-box sidebar-search-input',
      placeholder: this.activeSidebarTab === 'bots' ? 'Search bots...' : 'Search worlds...',
      value: this.sidebarSearchQuery,
      oninput: (e) => {
        stateManager.setState('searchQuery', e.target.value.trim());
      }
    });
    controlsNode.appendChild(searchInput);

    // 2. Sort Dropdown (For Bots or Worlds) - wrapped in custom chevron wrapper
    let sortSelectWrapper;
    if (this.activeSidebarTab === 'bots') {
      const select = DOM.el('select', {
        class: 'sort-select',
        onchange: (e) => {
          this.sidebarSortBy = e.target.value;
          this.filterAndRenderSidebarBots(contentNode);
        }
      },
        DOM.el('option', { value: 'chats' }, 'Sort by Chats'),
        DOM.el('option', { value: 'likes' }, 'Sort by Likes'),
        DOM.el('option', { value: 'alphabetical' }, 'Alphabetical (A-Z)')
      );
      select.value = this.sidebarSortBy;
      sortSelectWrapper = DOM.el('div', { class: 'sort-select-wrapper sidebar-sort-wrapper' }, select);
      controlsNode.appendChild(sortSelectWrapper);
    } else {
      const select = DOM.el('select', {
        class: 'sort-select',
        onchange: (e) => {
          this.sidebarSortBy = e.target.value;
          this.filterAndRenderSidebarWorlds(contentNode);
        }
      },
        DOM.el('option', { value: 'alphabetical' }, 'Alphabetical (A-Z)'),
        DOM.el('option', { value: 'popular' }, 'Bot Density')
      );
      select.value = this.sidebarSortBy;
      sortSelectWrapper = DOM.el('div', { class: 'sort-select-wrapper sidebar-sort-wrapper' }, select);
      controlsNode.appendChild(sortSelectWrapper);
    }

    // 3. Tags container
    const tagsContainer = DOM.el('div', { class: 'sidebar-tags-list sidebar-tags-container' });
    controlsNode.appendChild(tagsContainer);

    // 4. Render initial tag options and content list
    this.renderSidebarTags(tagsContainer, contentNode);
    if (this.activeSidebarTab === 'bots') {
      this.filterAndRenderSidebarBots(contentNode);
    } else {
      this.filterAndRenderSidebarWorlds(contentNode);
    }
  }

  renderSidebarTags(tagsContainer, contentNode) {
    DOM.clear(tagsContainer);
    
    let allTags = [];
    if (this.activeSidebarTab === 'bots') {
      allTags = Array.from(
        new Set(this.joylandBots.flatMap(b => b.tags || []))
      ).filter(Boolean).slice(0, 15);
    } else {
      allTags = Array.from(
        new Set(this.worlds.flatMap(w => w.genres || []))
      ).filter(Boolean).slice(0, 15);
    }
    
    // "All" filter tag
    const allBtn = DOM.el('span', {
      class: `tag tag-sm ${!this.activeSidebarTag ? 'active' : ''}`,
      onclick: () => {
        this.activeSidebarTag = null;
        this.renderSidebarTags(tagsContainer, contentNode);
        if (this.activeSidebarTab === 'bots') {
          this.filterAndRenderSidebarBots(contentNode);
        } else {
          this.filterAndRenderSidebarWorlds(contentNode);
        }
      }
    }, 'ALL');
    tagsContainer.appendChild(allBtn);

    allTags.forEach(tag => {
      const isSelected = this.activeSidebarTag === tag;
      const tagBtn = DOM.el('span', {
        class: `tag tag-sm ${isSelected ? 'active' : ''}`,
        onclick: () => {
          this.activeSidebarTag = isSelected ? null : tag;
          this.renderSidebarTags(tagsContainer, contentNode);
          if (this.activeSidebarTab === 'bots') {
            this.filterAndRenderSidebarBots(contentNode);
          } else {
            this.filterAndRenderSidebarWorlds(contentNode);
          }
        }
      }, tag.toUpperCase());
      tagsContainer.appendChild(tagBtn);
    });
  }

  filterAndRenderSidebarBots(container) {
    DOM.clear(container);
    
    let filtered = this.joylandBots.filter(bot => {
      const matchesSearch = !this.sidebarSearchQuery || 
        bot.name.toLowerCase().includes(this.sidebarSearchQuery) || 
        bot.introduce.toLowerCase().includes(this.sidebarSearchQuery);
        
      const matchesTag = !this.activeSidebarTag || bot.tags.includes(this.activeSidebarTag);
      
      return matchesSearch && matchesTag;
    });

    // Apply Sorting
    filtered.sort((a, b) => {
      if (this.sidebarSortBy === 'chats') {
        return this.parseCount(b.chats) - this.parseCount(a.chats);
      }
      if (this.sidebarSortBy === 'likes') {
        return this.parseCount(b.likes) - this.parseCount(a.likes);
      }
      return a.name.localeCompare(b.name);
    });

    if (filtered.length === 0) {
      if (this.isLoadingJoyland) {
        for (let i = 0; i < 3; i++) {
          const skeleton = BotCard.renderSkeleton();
          skeleton.classList.add('sidebar-bot-card-premium');
          container.appendChild(skeleton);
        }
      } else {
        container.appendChild(DOM.el('div', {
          class: 'sidebar-empty-results'
        }, 'No matching Joyland bots found.'));
      }
      return;
    }

    filtered.forEach(bot => {
      const card = BotCard.render(bot);
      card.classList.add('sidebar-bot-card-premium');
      container.appendChild(card);
    });
  }

  filterAndRenderSidebarWorlds(container) {
    DOM.clear(container);
    
    let filtered = this.worlds.filter(world => {
      const matchesSearch = !this.sidebarSearchQuery || 
        world.title.toLowerCase().includes(this.sidebarSearchQuery) || 
        world.description.toLowerCase().includes(this.sidebarSearchQuery);
        
      const matchesTag = !this.activeSidebarTag || (world.genres || []).includes(this.activeSidebarTag);
      
      return matchesSearch && matchesTag;
    });

    // Apply Sorting
    filtered.sort((a, b) => {
      if (this.sidebarSortBy === 'popular') {
        return (b.botCount || 0) - (a.botCount || 0);
      }
      return a.title.localeCompare(b.title);
    });

    if (filtered.length === 0) {
      container.appendChild(DOM.el('div', {
        class: 'sidebar-empty-results'
      }, 'No matching local worlds found.'));
      return;
    }

    filtered.forEach(world => {
      const card = WorldCard.render(world);
      card.classList.add('sidebar-bot-card-premium');
      container.appendChild(card);
    });
  }

  async fetchJoylandBotsInBackground(container) {
    const userIds = ['lMjZp', '2xYazJ', 'rd2be'];
    this.isLoadingJoyland = true;
    try {
      const results = await Promise.all(userIds.map(id => this.fetchPublicBots(id)));
      const bots = [];
      results.forEach(res => {
        const records = res?.result?.records || res?.bots || [];
        records.forEach(bot => {
          bots.push({
            id: bot.botId || Math.random().toString(),
            name: bot.characterName || bot.name || 'Unnamed Bot',
            avatar: bot.avatar || 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 100 100"><rect width="100%" height="100%" fill="%23161b24"/><text x="50" y="55" fill="%238b949e" font-size="20" text-anchor="middle">Bot</text></svg>',
            introduce: bot.introduce || bot.introduceText || 'No introduction provided.',
            chats: bot.botChats || bot.chatCount || '0',
            likes: bot.botLikes || bot.likeCount || '0',
            tags: bot.tags || []
          });
        });
      });
      this.joylandBots = bots;
      globalCache.set('joyland_bots', bots);
      
      // If user is currently viewing BOTS tab, refresh dynamic sidebar rendering
      if (this.activeSidebarTab === 'bots') {
        this.filterAndRenderSidebarBots(container);
      }
    } catch (e) {
      console.warn('Could not fetch dynamic bots from Joyland in background:', e);
    } finally {
      this.isLoadingJoyland = false;
    }
  }

  /**
   * Resets active search widgets and removes listeners.
   */
  unload() {
    this.subscriptions.forEach(unsubscribe => unsubscribe());
    
    if (this.searchController) this.searchController.destroy();

    const searchWrapper = document.getElementById('header-search-wrapper');
    if (searchWrapper) {
      searchWrapper.style.display = 'none';
    }
  }
}
export default LandingPage;


