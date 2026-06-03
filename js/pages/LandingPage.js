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

    // Update mobile nav drawer stats (mobile-stat IDs still exist in HTML)
    const updateStats = (id, val) => {
      const node = document.getElementById(id);
      if (node) node.textContent = val;
    };
    updateStats('mobile-stat-worlds', this.worlds.length);

    // Fetch all bots in the background to not block the main landing page render
    BotService.getAllBots().then(allBots => {
      const activeBotsCount = allBots.filter(b => BotService.hasActualChatLink(b)).length;
      updateStats('mobile-stat-bots', activeBotsCount);
    }).catch(err => {
      console.warn('Background stats calculation failed:', err);
    });

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
        stateManager.setState('searchQuery', '');
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
        stateManager.setState('searchQuery', '');
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
        stateManager.setState('searchQuery', '');
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
      )
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

  renderSidebar(controlsNode, contentNode) {
    DOM.clear(controlsNode);
    DOM.clear(contentNode);

    // 1. Search Input for Sidebar (Capsule layout)
    const searchInput = DOM.el('input', {
      type: 'text',
      class: 'search-input-box sidebar-search-input',
      placeholder: this.activeSidebarTab === 'bots' ? 'Search bots...' : (this.activeSidebarTab === 'tools' ? 'Search tools...' : 'Search worlds...'),
      value: this.sidebarSearchQuery,
      oninput: (e) => {
        stateManager.setState('searchQuery', e.target.value.trim());
      }
    });
    controlsNode.appendChild(searchInput);

    // 2. Sort Dropdown (For Bots, Worlds, or Tools) - wrapped in custom chevron wrapper
    let sortSelectWrapper;
    if (this.activeSidebarTab === 'bots') {
      const select = DOM.el('select', {
        class: 'sort-select',
        onchange: (e) => {
          this.sidebarSortBy = e.target.value;
          this.filterAndRenderSidebarBots(contentNode);
        }
      },
        DOM.el('option', { value: 'time' }, 'Sort by Time (Newest)'),
        DOM.el('option', { value: 'chats' }, 'Sort by Chats'),
        DOM.el('option', { value: 'likes' }, 'Sort by Likes'),
        DOM.el('option', { value: 'alphabetical' }, 'Alphabetical (A-Z)')
      );
      select.value = this.sidebarSortBy || 'time';
      sortSelectWrapper = DOM.el('div', { class: 'sort-select-wrapper sidebar-sort-wrapper', style: { flex: '1' } }, select);
      
      const genderSelect = DOM.el('select', {
        class: 'sort-select',
        onchange: (e) => {
          this.activeGenderFilter = e.target.value;
          this.filterAndRenderSidebarBots(contentNode);
        }
      },
        DOM.el('option', { value: 'All' }, 'All Genders'),
        DOM.el('option', { value: 'Male' }, 'Male'),
        DOM.el('option', { value: 'Female' }, 'Female'),
        DOM.el('option', { value: 'Non-binary' }, 'Non-binary')
      );
      genderSelect.value = this.activeGenderFilter || 'All';
      const genderSelectWrapper = DOM.el('div', { class: 'sort-select-wrapper sidebar-sort-wrapper', style: { flex: '1' } }, genderSelect);
      
      const filtersRow = DOM.el('div', { class: 'sidebar-filters-row' }, sortSelectWrapper, genderSelectWrapper);
      controlsNode.appendChild(filtersRow);
    } else if (this.activeSidebarTab === 'worlds') {
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
    } else if (this.activeSidebarTab === 'tools') {
      const select = DOM.el('select', {
        class: 'sort-select',
        onchange: (e) => {
          this.sidebarSortBy = e.target.value;
          this.filterAndRenderSidebarTools(contentNode);
        }
      },
        DOM.el('option', { value: 'alphabetical' }, 'Alphabetical (A-Z)'),
        DOM.el('option', { value: 'beta' }, 'Beta Status')
      );
      select.value = this.sidebarSortBy || 'alphabetical';
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
    } else if (this.activeSidebarTab === 'worlds') {
      this.filterAndRenderSidebarWorlds(contentNode);
    } else if (this.activeSidebarTab === 'tools') {
      this.filterAndRenderSidebarTools(contentNode);
    }
  }

  renderSidebarTags(tagsContainer, contentNode) {
    DOM.clear(tagsContainer);
    
    if (this.activeSidebarTab === 'tools') {
      tagsContainer.style.display = 'none';
      return;
    } else {
      tagsContainer.style.display = 'flex';
    }
    
    let allTags = [];
    if (this.activeSidebarTab === 'bots') {
      const categories = this.joylandBots.map(b => b.category);
      const tags = this.joylandBots.flatMap(b => b.tags || []);
      allTags = Array.from(new Set([...categories, ...tags])).filter(Boolean).slice(0, 15);
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
        
        const sidebarInput = this.appRoot.querySelector('.sidebar-search-input');
        if (sidebarInput) sidebarInput.value = '';
        stateManager.setState('searchQuery', '');

        this.renderSidebarTags(tagsContainer, contentNode);
      }
    }, 'ALL');
    tagsContainer.appendChild(allBtn);

    allTags.forEach(tag => {
      const isSelected = this.activeSidebarTag === tag;
      const tagBtn = DOM.el('span', {
        class: `tag tag-sm ${isSelected ? 'active' : ''}`,
        onclick: () => {
          this.activeSidebarTag = isSelected ? null : tag;
          
          const sidebarInput = this.appRoot.querySelector('.sidebar-search-input');
          if (sidebarInput) sidebarInput.value = isSelected ? '' : tag;
          stateManager.setState('searchQuery', isSelected ? '' : tag);

          this.renderSidebarTags(tagsContainer, contentNode);
        }
      }, tag.toUpperCase());
      tagsContainer.appendChild(tagBtn);
    });
  }

  filterAndRenderSidebarBots(container) {
    DOM.clear(container);
    
    let filtered = this.joylandBots.filter(bot => {
      const search = this.sidebarSearchQuery;
      const matchesSearch = !search || 
        bot.name.toLowerCase().includes(search) || 
        bot.introduce.toLowerCase().includes(search) ||
        (bot.category && bot.category.toLowerCase().includes(search)) ||
        (bot.tags && bot.tags.some(t => t.toLowerCase().includes(search)));
        
      const matchesGender = !this.activeGenderFilter || this.activeGenderFilter === 'All' || bot.gender === this.activeGenderFilter;
      const matchesTag = !this.activeSidebarTag || (bot.tags && bot.tags.includes(this.activeSidebarTag)) || bot.category === this.activeSidebarTag;
      
      return matchesSearch && matchesTag && matchesGender;
    });

    // Apply Sorting
    filtered.sort((a, b) => {
      if (this.sidebarSortBy === 'time') {
        return a.timeIndex - b.timeIndex;
      }
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
        world.description.toLowerCase().includes(this.sidebarSearchQuery) ||
        (world.genres || []).some(genre => genre.toLowerCase().includes(this.sidebarSearchQuery));
        
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

  filterAndRenderSidebarTools(container) {
    DOM.clear(container);
    
    let filtered = this.tools.filter(tool => {
      const search = this.sidebarSearchQuery;
      return !search || 
        tool.name.toLowerCase().includes(search) || 
        tool.intro.toLowerCase().includes(search);
    });

    // Apply Sorting
    filtered.sort((a, b) => {
      if (this.sidebarSortBy === 'beta') {
        return (b.ifbeta ? 1 : 0) - (a.ifbeta ? 1 : 0) || a.name.localeCompare(b.name);
      }
      return a.name.localeCompare(b.name);
    });

    if (filtered.length === 0) {
      container.appendChild(DOM.el('div', {
        class: 'sidebar-empty-results'
      }, 'No matching tools found.'));
      return;
    }

    filtered.forEach(tool => {
      const card = ToolCard.render(tool);
      card.classList.add('sidebar-bot-card-premium');
      container.appendChild(card);
    });
  }

  async fetchJoylandBotsInBackground(container) {
    this.isLoadingJoyland = true;
    try {
      this.joylandBots = await BotService.getJoylandBots();
      
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


